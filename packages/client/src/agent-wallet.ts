/**
 * AgentWallet — Autonomous payment agent with budget controls
 *
 * Designed for AI agents that need to autonomously pay for API access.
 * Enforces per-transaction, per-session, and per-day spend limits.
 * Uses real Stacks transaction signing via buildPaymentTransaction.
 *
 * @example
 * const agent = new AgentWallet({
 *   key: process.env.AGENT_KEY,
 *   budget: { perTx: 1_000_000n, perDay: 50_000_000n, tokens: ['USDCx', 'sBTC'] },
 * });
 * const res = await agent.fetch('/api/ai/generate');
 */
import {
  X402_HEADERS,
  decodePaymentRequirements,
  encodePaymentPayload,
  type PaymentPayload,
  type PaymentRequirements,
  type TokenSymbol,
} from "@paystream/core";
import { buildPaymentTransaction } from "./signer.js";

export interface BudgetLimits {
  /** Max micro-units per single transaction */
  perTx: bigint;
  /** Max micro-units per session (optional) */
  perSession?: bigint;
  /** Max micro-units per day */
  perDay: bigint;
  /** Allowed token symbols. Defaults to all. */
  tokens?: TokenSymbol[];
}

export interface AgentWalletConfig {
  /** Stacks private key (hex) */
  key: string;
  /** Network — mainnet or testnet */
  network?: "mainnet" | "testnet";
  /** Budget constraints */
  budget: BudgetLimits;
}

interface SpendLog {
  timestamp: number;
  amount: bigint;
  token: string;
  resource: string;
  txId?: string;
}

export class AgentWallet {
  private key: string;
  private network: "mainnet" | "testnet";
  private budget: BudgetLimits;
  private sessionSpend = 0n;
  private dailySpend = 0n;
  private dailyReset: number;
  private log: SpendLog[] = [];

  constructor(config: AgentWalletConfig) {
    this.key = config.key;
    this.network = config.network ?? "mainnet";
    this.budget = config.budget;
    this.dailyReset = this.startOfDay();
  }

  /** Get the Stacks address associated with this agent's private key. */
  async getAddress(): Promise<string> {
    const { getAddressFromPrivateKey, TransactionVersion } = await import("@stacks/transactions");
    const version = this.network === "testnet" ? TransactionVersion.Testnet : TransactionVersion.Mainnet;
    return getAddressFromPrivateKey(this.key, version);
  }

  /**
   * Fetch a URL, automatically handling x402 payment if required.
   * Respects all configured budget limits.
   */
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    // Initial request
    let res = await globalThis.fetch(url, init);

    if (res.status !== 402) return res;

    // ── Parse requirements ─────────────────────────────────────────────────
    const reqHeader =
      res.headers.get(X402_HEADERS.REQUIREMENTS) ??
      res.headers.get(X402_HEADERS.REQUIREMENTS.toLowerCase());
    if (!reqHeader)
      throw new Error("402 response missing payment requirements header");

    const requirements = decodePaymentRequirements(reqHeader);
    const amount = BigInt(requirements.maxAmountRequired);

    // ── Budget checks ──────────────────────────────────────────────────────
    this.checkBudget(amount);

    // ── Select token ───────────────────────────────────────────────────────
    // Handle both @paystream (tokens array) and x402-stacks (tokenType string) formats
    let accepted: string[] = [];
    if (requirements.acceptedTokens && Array.isArray(requirements.acceptedTokens)) {
      accepted = requirements.acceptedTokens;
    } else if (requirements.tokens && Array.isArray(requirements.tokens)) {
      accepted = requirements.tokens.map((t) => t.symbol);
    } else if ((requirements as any).tokenType) {
      accepted = [(requirements as any).tokenType];
    } else if (requirements.extra?.acceptedTokens) {
      accepted = requirements.extra.acceptedTokens;
    }

    const allowed: string[] = this.budget.tokens ?? (accepted as TokenSymbol[]);
    const token = allowed.find((t) => accepted.includes(t));

    if (!token)
      throw new Error(
        `No allowed token accepted. Accepted: [${accepted.join(", ")}], Allowed: [${allowed.join(", ")}]`,
      );

    // ── Sign and retry ─────────────────────────────────────────────────────
    const payload = await this.signReal(requirements, token as TokenSymbol);
    const encoded = encodePaymentPayload(payload);

    const headers = new Headers(init?.headers);
    headers.set(X402_HEADERS.PAYMENT, encoded);
    res = await globalThis.fetch(url, { ...init, headers });

    if (res.ok) {
      this.recordSpend(amount, token, url);
    } else if (res.status === 402) {
      throw new Error(`Double 402: Facilitator rejected the payment signature or nonce. Status: 402`);
    } else if (res.status === 403 || res.status === 401) {
      const body = await res.text().catch(() => "No details");
      throw new Error(`Payment Failed: Facilitator or Merchant rejected the request after signature. Status: ${res.status}. ${body}`);
    } else if (res.status >= 500) {
      throw new Error(`Server Error: Endpoint failed after payment. Status: ${res.status}`);
    }

    return res;
  }

  /** Check if amount is within all budget limits; throws if exceeded. */
  private checkBudget(amount: bigint): void {
    this.resetDailyIfNeeded();

    if (amount > this.budget.perTx) {
      throw new Error(
        `Budget: exceeds per-tx limit. ${amount} > ${this.budget.perTx}`,
      );
    }
    if (
      this.budget.perSession &&
      this.sessionSpend + amount > this.budget.perSession
    ) {
      throw new Error(
        `Budget: exceeds session limit. ${this.sessionSpend + amount} > ${this.budget.perSession}`,
      );
    }
    if (this.dailySpend + amount > this.budget.perDay) {
      throw new Error(
        `Budget: exceeds daily limit. ${this.dailySpend + amount} > ${this.budget.perDay}`,
      );
    }
  }

  /** Record a successful spend. */
  private recordSpend(amount: bigint, token: string, resource: string): void {
    this.sessionSpend += amount;
    this.dailySpend += amount;
    this.log.push({ timestamp: Date.now(), amount, token, resource });
  }

  /**
   * Build and sign a real Stacks PaymentPayload.
   *
   * Uses buildPaymentTransaction() from signer.ts which calls @stacks/transactions
   * to produce a serialized, signed Stacks transaction.
   * Uses getAddressFromPrivateKey() for correct STX address derivation.
   */
  private async signReal(
    req: PaymentRequirements,
    token: TokenSymbol,
  ): Promise<PaymentPayload> {
    const timestamp = Date.now();
    const networkId: "stacks:1" | "stacks:2147483648" =
      this.network === "testnet" ? "stacks:2147483648" : "stacks:1";

    // Derive the real STX address from the private key
    let fromAddress: string;
    let signature: string;

    try {
      const { getAddressFromPrivateKey, TransactionVersion } =
        await import("@stacks/transactions");
      const version =
        this.network === "testnet"
          ? TransactionVersion.Testnet
          : TransactionVersion.Mainnet;
      fromAddress = getAddressFromPrivateKey(this.key, version);

      const { serializedTx } = await buildPaymentTransaction(
        token,
        req.maxAmountRequired,
        req.payTo,
        { privateKey: this.key, network: this.network },
      );
      signature = serializedTx;
    } catch (err) {
      throw new Error(
        `AgentWallet: Failed to sign payment — ${err instanceof Error ? err.message : String(err)}. ` +
          "Ensure AGENT_PRIVATE_KEY is a valid Stacks private key hex.",
      );
    }

    return {
      scheme: req.scheme,
      network: networkId,
      token,
      signature,
      fromAddress,
      amount: req.maxAmountRequired,
      payTo: req.payTo,
      timestamp,
      nonce: `${timestamp}_${Math.random().toString(36).slice(2)}`,
      resource: req.resource,
    };
  }

  private startOfDay(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private resetDailyIfNeeded(): void {
    const today = this.startOfDay();
    if (today > this.dailyReset) {
      this.dailySpend = 0n;
      this.dailyReset = today;
    }
  }

  /** Get full spend log */
  getLog(): SpendLog[] {
    return [...this.log];
  }

  /** Get remaining budgets */
  getRemainingBudget() {
    this.resetDailyIfNeeded();
    return {
      perTx: this.budget.perTx,
      session: this.budget.perSession
        ? this.budget.perSession - this.sessionSpend
        : undefined,
      daily: this.budget.perDay - this.dailySpend,
      totalSpent: this.sessionSpend,
    };
  }

  /** Reset session spend counter */
  resetSession(): void {
    this.sessionSpend = 0n;
  }
}

// @devvmichael/paystream-core — Protocol Types
// Defines the data structures for the PayStream x402 protocol on Stacks

// ─── Token Types ───────────────────────────────────────────────────────────────

export type TokenSymbol = "STX" | "sBTC" | "USDCx";

export interface SupportedToken {
  symbol: TokenSymbol;
  name: string;
  contractAddress?: string; // For SIP-010 tokens (sBTC, USDCx)
  contractName?: string;
  decimals: number;
  amount: string; // Price in this token's smallest unit
  icon?: string;
}

// ─── Payment Schemes ───────────────────────────────────────────────────────────

export type PaymentScheme = "exact" | "streaming";

export type NetworkId = "stacks:1" | "stacks:2147483648"; // mainnet | testnet

// ─── x402 Protocol Types ───────────────────────────────────────────────────────

export interface PaymentRequirements {
  scheme: PaymentScheme;
  network: NetworkId;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType?: string;
  payTo: string; // Merchant's STX address
  tokens: SupportedToken[];
  /** Flattened list of accepted token symbols (shorthand for middleware) */
  acceptedTokens?: string[];
  extra?: PaymentExtras;
}

export interface PaymentExtras {
  /** Per-second rate in token's smallest unit (for streaming) */
  streamingRate?: string;
  /** Maximum stream duration in seconds */
  maxDuration?: number;
  /** Whether cross-token swaps via Bitflow are accepted */
  swapAccepted?: boolean;
  /** Accepted token symbols list */
  acceptedTokens?: string[];
  /** Facilitator URL */
  facilitatorUrl?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

/**
 * Payment payload sent by the client in the X-Payment header.
 * Uses a flat structure for simplicity and HTTP header efficiency.
 */
export interface PaymentPayload {
  scheme: PaymentScheme;
  network: NetworkId;
  token: TokenSymbol;
  /** Serialized signed transaction (hex) or mock sig for testing */
  signature: string;
  /** Payer's STX address */
  fromAddress: string;
  /** Amount in micro-units of the selected token */
  amount: string;
  /** Merchant's STX address */
  payTo: string;
  /** Unix timestamp of this payment */
  timestamp: number;
  /** Unique nonce to prevent replay */
  nonce: string;
  /** The protected resource URL */
  resource: string;
}

export interface PaymentReceipt {
  txId: string;
  blockHeight: number;
  amount: string;
  token: TokenSymbol;
  payer: string;
  payee: string;
  timestamp: number;
  resource: string;
  proofHash: string; // On-chain proof reference
}

// ─── Streaming Session Types ───────────────────────────────────────────────────

export type StreamStatus =
  | "pending"
  | "active"
  | "paused"
  | "settled"
  | "expired"
  | "cancelled";

export interface StreamingSession {
  sessionId: string;
  payer: string;
  payee: string;
  token: TokenSymbol;
  ratePerSecond: string;
  startTime: number;
  endTime?: number;
  escrowTxId: string;
  totalDeposited: string;
  totalConsumed: string;
  status: StreamStatus;
}

export interface StreamingConfig {
  ratePerSecond: string;
  maxDuration: number; // seconds
  token: TokenSymbol;
  escrowAmount: string;
}

// ─── Facilitator Types ─────────────────────────────────────────────────────────

export interface VerificationResult {
  valid: boolean;
  error?: string;
  details?: {
    sender: string;
    amount: string;
    balance: string;
  };
}

export interface SettlementResult {
  success: boolean;
  txId?: string;
  blockHeight?: number;
  error?: string;
}

// ─── Agent Wallet Types ────────────────────────────────────────────────────────

export interface BudgetLimits {
  maxPerTransaction: bigint;
  maxPerSession: bigint;
  maxPerDay: bigint;
  allowedTokens: TokenSymbol[];
  allowedDomains?: string[];
}

export interface SpendEntry {
  timestamp: number;
  amount: string;
  token: TokenSymbol;
  resource: string;
  txId?: string;
}

export interface AgentWalletConfig {
  privateKey: string;
  network: NetworkId;
  budgetLimits: BudgetLimits;
  autoApprove?: boolean;
  maxAutoApproveAmount?: string;
}

// ─── SDK Config Types ──────────────────────────────────────────────────────────

export interface PayStreamServerConfig {
  payTo: string;
  network: "mainnet" | "testnet";
  facilitatorUrl?: string;
  pricing: PricingConfig;
}

export interface PricingConfig {
  type: "fixed" | "dynamic" | "streaming";
  amount?: string;
  token?: TokenSymbol;
  tokens?: TokenSymbol[];
  perSecondRate?: string;
}

export interface PayStreamClientConfig {
  network: "mainnet" | "testnet";
  walletType: "agent" | "browser";
  privateKey?: string; // For agent wallets
  budgetLimits?: BudgetLimits;
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface PaymentRequiredResponse {
  status: 402;
  paymentRequirements: PaymentRequirements;
  message: string;
}

export interface PaymentSuccessResponse<T = unknown> {
  data: T;
  receipt: PaymentReceipt;
}

// ─── Cross-Token Swap Types ────────────────────────────────────────────────────

export interface SwapQuote {
  fromToken: TokenSymbol;
  toToken: TokenSymbol;
  fromAmount: string;
  toAmount: string;
  exchangeRate: string;
  slippage: number;
  route: string[];
  estimatedGas: string;
  provider: "bitflow";
}

export interface SwapResult {
  success: boolean;
  txId?: string;
  fromAmount: string;
  toAmount: string;
  actualRate: string;
  error?: string;
}

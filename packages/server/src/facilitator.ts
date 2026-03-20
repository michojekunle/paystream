/**
 * @paystream/server — Production Facilitator
 *
 * Uses x402-stacks X402PaymentVerifier to verify signatures and settle
 * payments by broadcasting real Stacks transactions via the facilitator service.
 *
 * Both verify() and settle() are real — no mock txIds.
 *
 * Usage:
 *   const facilitator = createFacilitator({ network: 'testnet' });
 *   const verified = await facilitator.verify(payload);
 *   if (verified.valid) await facilitator.settle(serializedTx, opts);
 */
import type {
  PaymentPayload,
  VerificationResult,
  SettlementResult,
} from "@paystream/core";
import { STACKS_API_URLS } from "@paystream/core";

export interface FacilitatorConfig {
  /** Facilitator service URL. Defaults to process.env.FACILITATOR_URL */
  facilitatorUrl?: string;
  /** Network: mainnet or testnet. Defaults to testnet. */
  network?: "mainnet" | "testnet";
  /** Stacks node RPC URL. Defaults to Hiro API. */
  stacksNodeUrl?: string;
}

export { VerificationResult, SettlementResult };

/**
 * Creates a production facilitator using x402-stacks X402PaymentVerifier.
 * Requires the facilitator service to be running at FACILITATOR_URL.
 */
export function createFacilitator(config: FacilitatorConfig = {}) {
  const network = config.network ?? "testnet";
  const facilitatorUrl =
    config.facilitatorUrl ?? process.env.FACILITATOR_URL ?? "";
  const stacksNodeUrl = config.stacksNodeUrl ?? STACKS_API_URLS[network];

  if (!facilitatorUrl) {
    console.warn(
      "[PayStream] No facilitatorUrl configured. Set FACILITATOR_URL env var.",
    );
  }

  /**
   * Verified payment by cryptographically checking the signature.
   * Lazily initializes x402-stacks verifier since it's an ESM environment.
   */
  const getVerifier = async () => {
    try {
      const { X402PaymentVerifier } = (await import("x402-stacks")) as unknown as {
        X402PaymentVerifier: new (
          facilitatorUrl: string,
          network: string,
        ) => {
          verify: (
            payload: unknown,
          ) => Promise<{ valid: boolean; error?: string; details?: unknown }>;
          settle: (
            signedTx: string,
            opts: { recipient: string; amount: string; asset: string },
          ) => Promise<{
            success: boolean;
            transaction?: string;
            error?: string;
          }>;
        };
      };
      return new X402PaymentVerifier(facilitatorUrl, network);
    } catch {
      throw new Error(
        "[PayStream] x402-stacks failed to load. Ensure it is installed.",
      );
    }
  };

  return {
    /**
     * Verify a payment payload is cryptographically valid.
     * Delegates to x402-stacks X402PaymentVerifier.verify()
     */
    async verify(payload: PaymentPayload): Promise<VerificationResult> {
      // Structural checks before hitting the facilitator
      if (!payload.signature || payload.signature.length < 8) {
        return { valid: false, error: "Missing or invalid signature" };
      }
      if (!payload.amount || BigInt(payload.amount) <= 0n) {
        return { valid: false, error: "Invalid amount" };
      }
      if (!payload.payTo) {
        return { valid: false, error: "Missing payTo address" };
      }
      if (!payload.fromAddress) {
        return { valid: false, error: "Missing fromAddress" };
      }
      // Timestamp check — reject payments older than 10 minutes
      const TEN_MIN = 10 * 60 * 1000;
      if (Date.now() - payload.timestamp > TEN_MIN) {
        return { valid: false, error: "Payment expired" };
      }

      // Delegate full cryptographic verification to x402-stacks
      try {
        const verifier = await getVerifier();
        const result = await verifier.verify(payload);
        return {
          valid: result.valid,
          error: result.error,
          details: result.details as
            | { sender: string; amount: string; balance: string }
            | undefined,
        };
      } catch (err) {
        return {
          valid: false,
          error: `Verification error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },

    /**
     * Settle a verified payment by broadcasting the signed transaction
     */
    async settle(payload: PaymentPayload): Promise<SettlementResult> {
      try {
        const verifier = await getVerifier();
        const result = await verifier.settle(payload.signature, {
          recipient: payload.payTo,
          amount: payload.amount,
          asset: payload.token,
        });

        if (!result.success || !result.transaction) {
          return {
            success: false,
            error: result.error ?? "Settlement failed — no txId returned",
          };
        }
        return {
          success: true,
          txId: result.transaction,
        };
      } catch (err) {
        return {
          success: false,
          error: `Settlement error: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },

    /** Get the configured Stacks node URL */
    get nodeUrl() {
      return stacksNodeUrl;
    },
  };
}

/**
 * @devvmichael/paystream-server — Payment verification utilities
 */
import type { PaymentPayload, PaymentRequirements } from "@devvmichael/paystream-core";
import { isPaymentSufficient } from "@devvmichael/paystream-core";

export interface VerifyOptions {
  /** Check that payload.payTo matches expected recipient */
  checkRecipient?: boolean;
  /** Check that amount meets requirements */
  checkAmount?: boolean;
}

/**
 * Verify a payment payload satisfies the given requirements.
 * Returns an array of error strings (empty = valid).
 */
export function verifyPayment(
  payload: PaymentPayload,
  requirements: PaymentRequirements,
  options: VerifyOptions = {},
): string[] {
  const { checkRecipient = true, checkAmount = true } = options;
  const errors: string[] = [];

  // Scheme must match
  if (payload.scheme !== requirements.scheme) {
    errors.push(
      `Scheme mismatch: expected ${requirements.scheme}, got ${payload.scheme}`,
    );
  }

  // Network must match
  if (payload.network !== requirements.network) {
    errors.push(
      `Network mismatch: expected ${requirements.network}, got ${payload.network}`,
    );
  }

  // Recipient check
  if (checkRecipient && payload.payTo !== requirements.payTo) {
    errors.push(
      `Recipient mismatch: expected ${requirements.payTo}, got ${payload.payTo}`,
    );
  }

  // Amount check (uses SupportedToken list or maxAmountRequired fallback)
  if (checkAmount && !isPaymentSufficient(payload, requirements)) {
    errors.push(
      `Insufficient payment for token ${payload.token}. Required: ${requirements.maxAmountRequired}, got: ${payload.amount}`,
    );
  }

  return errors;
}

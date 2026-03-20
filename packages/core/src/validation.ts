// @devvmichael/paystream-core — Validation
// Schema validation for protocol messages

import { PaymentPayload, PaymentRequirements, TokenSymbol } from "./types.js";
import { PROTOCOL } from "./constants.js";

const VALID_SCHEMES = ["exact", "streaming"] as const;
const VALID_NETWORKS = ["stacks:1", "stacks:2147483648"] as const;
const VALID_TOKENS: TokenSymbol[] = ["STX", "sBTC", "USDCx"];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a PaymentRequirements object
 */
export function validatePaymentRequirements(
  req: PaymentRequirements,
): ValidationResult {
  const errors: string[] = [];

  if (
    !req.scheme ||
    !VALID_SCHEMES.includes(req.scheme as (typeof VALID_SCHEMES)[number])
  ) {
    errors.push(
      `Invalid scheme: ${req.scheme}. Must be one of: ${VALID_SCHEMES.join(", ")}`,
    );
  }

  if (
    !req.network ||
    !VALID_NETWORKS.includes(req.network as (typeof VALID_NETWORKS)[number])
  ) {
    errors.push(
      `Invalid network: ${req.network}. Must be one of: ${VALID_NETWORKS.join(", ")}`,
    );
  }

  if (
    !req.maxAmountRequired ||
    BigInt(req.maxAmountRequired) < BigInt(PROTOCOL.MIN_PAYMENT_AMOUNT)
  ) {
    errors.push(`Amount too low. Minimum: ${PROTOCOL.MIN_PAYMENT_AMOUNT}`);
  }

  if (!req.resource) {
    errors.push("Resource URL is required");
  }

  if (!req.payTo) {
    errors.push("payTo address is required");
  }

  // tokens array is optional when acceptedTokens shorthand is used
  if (req.tokens && req.tokens.length > 0) {
    for (const token of req.tokens) {
      if (!VALID_TOKENS.includes(token.symbol)) {
        errors.push(`Unsupported token: ${token.symbol}`);
      }
      if (!token.amount || BigInt(token.amount) <= 0n) {
        errors.push(`Invalid amount for token ${token.symbol}`);
      }
    }
  } else if (!req.acceptedTokens || req.acceptedTokens.length === 0) {
    errors.push("At least one supported token must be specified");
  }

  if (req.scheme === "streaming") {
    if (!req.extra?.streamingRate) {
      errors.push("Streaming rate is required for streaming scheme");
    }
    if (!req.extra?.maxDuration || req.extra.maxDuration <= 0) {
      errors.push("Max duration is required for streaming scheme");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a PaymentPayload (flat structure)
 */
export function validatePaymentPayload(payload: PaymentPayload): string[] {
  const errors: string[] = [];

  if (
    !payload.scheme ||
    !VALID_SCHEMES.includes(payload.scheme as (typeof VALID_SCHEMES)[number])
  ) {
    errors.push(`Invalid scheme: ${payload.scheme}`);
  }

  if (
    !payload.network ||
    !VALID_NETWORKS.includes(payload.network as (typeof VALID_NETWORKS)[number])
  ) {
    errors.push(`Invalid network: ${payload.network}`);
  }

  if (!VALID_TOKENS.includes(payload.token)) {
    errors.push(`Unsupported token: ${payload.token}`);
  }

  if (!payload.signature || payload.signature.length < 4) {
    errors.push("Signature is required");
  }

  if (!payload.fromAddress) {
    errors.push("fromAddress is required");
  }

  if (!payload.amount || BigInt(payload.amount) <= 0n) {
    errors.push("Invalid payment amount");
  }

  if (!payload.payTo) {
    errors.push("payTo address is required");
  }

  // Check expiry: timestamp must be within 10 minutes
  const TEN_MINUTES = 10 * 60 * 1000;
  if (payload.timestamp && Date.now() - payload.timestamp > TEN_MINUTES) {
    errors.push("Payment has expired");
  }

  return errors;
}

/**
 * Check if a payment amount satisfies the requirements.
 * Works with both flat acceptedTokens and full SupportedToken arrays.
 */
export function isPaymentSufficient(
  payload: PaymentPayload,
  requirements: PaymentRequirements,
): boolean {
  if (requirements.tokens && requirements.tokens.length > 0) {
    const matchingToken = requirements.tokens.find(
      (t) => t.symbol === payload.token,
    );
    if (!matchingToken) return false;
    return BigInt(payload.amount) >= BigInt(matchingToken.amount);
  }
  // Fallback: just check against maxAmountRequired
  return BigInt(payload.amount) >= BigInt(requirements.maxAmountRequired);
}

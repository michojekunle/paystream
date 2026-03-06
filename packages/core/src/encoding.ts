// @paystream/core — Encoding Utilities
// Base64 encode/decode helpers for x402 HTTP headers

import { PaymentPayload, PaymentReceipt, PaymentRequirements } from "./types";

/**
 * Encode a PaymentRequirements object to base64 for the payment-required header
 */
export function encodePaymentRequirements(
  requirements: PaymentRequirements,
): string {
  return Buffer.from(JSON.stringify(requirements)).toString("base64");
}

/**
 * Decode a base64-encoded PaymentRequirements from the payment-required header
 */
export function decodePaymentRequirements(
  encoded: string,
): PaymentRequirements {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(decoded) as PaymentRequirements;
  } catch {
    throw new Error("Failed to decode payment requirements");
  }
}

/**
 * Encode a PaymentPayload to base64 for the payment-signature header
 */
export function encodePaymentPayload(payload: PaymentPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Decode a base64-encoded PaymentPayload from the payment-signature header
 */
export function decodePaymentPayload(encoded: string): PaymentPayload {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(decoded) as PaymentPayload;
  } catch {
    throw new Error("Failed to decode payment payload");
  }
}

/**
 * Encode a PaymentReceipt to base64 for the payment-response header
 */
export function encodePaymentReceipt(receipt: PaymentReceipt): string {
  return Buffer.from(JSON.stringify(receipt)).toString("base64");
}

/**
 * Decode a base64-encoded PaymentReceipt from the payment-response header
 */
export function decodePaymentReceipt(encoded: string): PaymentReceipt {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(decoded) as PaymentReceipt;
  } catch {
    throw new Error("Failed to decode payment receipt");
  }
}

/**
 * Generate a unique payment ID from payment details
 */
export function generatePaymentId(
  sender: string,
  resource: string,
  timestamp: number,
): string {
  const data = `${sender}:${resource}:${timestamp}`;
  // Simple hash for demo — in production use crypto
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Format token amount for display (micro-units → human readable)
 */
export function formatTokenAmount(amount: string, decimals: number): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0");

  // Trim trailing zeros but keep at least 2 decimal places
  const trimmed = fractionStr.replace(/0+$/, "").padEnd(2, "0");

  return `${whole}.${trimmed}`;
}

/**
 * Parse a human-readable amount to micro-units
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + paddedFraction).toString();
}

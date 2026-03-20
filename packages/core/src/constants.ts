// @devvmichael/paystream-core — Constants
// Network configs, token addresses, and protocol defaults

import { NetworkId, SupportedToken, TokenSymbol } from "./types.js";

// ─── Network Configuration ────────────────────────────────────────────────────

export const STACKS_MAINNET: NetworkId = "stacks:1";
export const STACKS_TESTNET: NetworkId = "stacks:2147483648";

export const STACKS_API_URLS = {
  mainnet: "https://api.mainnet.hiro.so",
  testnet: "https://api.testnet.hiro.so",
} as const;

// ─── Token Addresses (Stacks) ──────────────────────────────────────────────────

export const TOKEN_CONTRACTS: Record<
  TokenSymbol,
  { address: string; name: string } | null
> = {
  STX: null, // Native token — no contract
  sBTC: {
    address: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4",
    name: "sbtc-token",
  },
  USDCx: {
    address: "SP3Y2ZSH8P7D50B0VBTSX11S7XSG24M1VB9YFQA4K",
    name: "token-usdcx",
  },
};

// ─── Token Metadata ────────────────────────────────────────────────────────────

export const TOKEN_METADATA: Record<
  TokenSymbol,
  { name: string; decimals: number; icon: string }
> = {
  STX: { name: "Stacks", decimals: 6, icon: "⚡" },
  sBTC: { name: "sBTC", decimals: 8, icon: "₿" },
  USDCx: { name: "USDCx", decimals: 6, icon: "💲" },
};

/**
 * Flat map of supported tokens (symbol → metadata).
 * Used by server middleware for token validation.
 */
export const SUPPORTED_TOKENS: Record<
  TokenSymbol,
  { name: string; decimals: number }
> = {
  STX: { name: "Stacks", decimals: 6 },
  sBTC: { name: "sBTC", decimals: 8 },
  USDCx: { name: "USDCx", decimals: 6 },
};

// ─── Default Supported Tokens ──────────────────────────────────────────────────

export function getDefaultTokens(
  amounts?: Partial<Record<TokenSymbol, string>>,
): SupportedToken[] {
  return [
    {
      symbol: "STX",
      name: "Stacks",
      decimals: 6,
      amount: amounts?.STX || "100000", // 0.1 STX
      icon: "⚡",
    },
    {
      symbol: "sBTC",
      name: "sBTC",
      contractAddress: TOKEN_CONTRACTS.sBTC?.address,
      contractName: TOKEN_CONTRACTS.sBTC?.name,
      decimals: 8,
      amount: amounts?.sBTC || "100", // 0.000001 BTC
      icon: "₿",
    },
    {
      symbol: "USDCx",
      name: "USDCx",
      contractAddress: TOKEN_CONTRACTS.USDCx?.address,
      contractName: TOKEN_CONTRACTS.USDCx?.name,
      decimals: 6,
      amount: amounts?.USDCx || "10000", // $0.01
      icon: "💲",
    },
  ];
}

// ─── x402 HTTP Headers ────────────────────────────────────────────────────────

/**
 * Standard x402 HTTP header names used across server and client.
 */
export const X402_HEADERS = {
  /** Sent with 402 response — base64 PaymentRequirements JSON */
  REQUIREMENTS: "payment-required",
  /** Sent by client on retry — base64 signed transaction (x402-stacks v2 spec) */
  PAYMENT: "payment-signature",
  /** Sent by server on success — base64 PaymentReceipt JSON */
  RESPONSE: "x-payment-response",
} as const;

// ─── Protocol Constants ────────────────────────────────────────────────────────

export const PROTOCOL = {
  /** Version of the PayStream protocol */
  VERSION: "1.0.0",
  /** Header name for payment requirements (402 response) */
  HEADER_PAYMENT_REQUIRED: "payment-required",
  /** Header name for payment signature (client request, x402-stacks v2) */
  HEADER_PAYMENT_SIGNATURE: "payment-signature",
  /** Header name for payment response (server success) */
  HEADER_PAYMENT_RESPONSE: "x-payment-response",
  /** Default payment validity window (5 minutes) */
  DEFAULT_VALIDITY_MS: 5 * 60 * 1000,
  /** Default streaming session max duration (1 hour) */
  DEFAULT_MAX_STREAM_DURATION: 3600,
  /** Minimum payment amount in micro-units */
  MIN_PAYMENT_AMOUNT: "1000",
} as const;

// ─── Bitflow DEX Config ────────────────────────────────────────────────────────

export const BITFLOW = {
  API_HOST: "https://api.bitflow.finance",
  /** Supported swap pairs */
  PAIRS: [
    { from: "STX", to: "sBTC" },
    { from: "STX", to: "USDCx" },
    { from: "sBTC", to: "USDCx" },
    { from: "sBTC", to: "STX" },
    { from: "USDCx", to: "STX" },
    { from: "USDCx", to: "sBTC" },
  ] as const,
  /** Default slippage tolerance (0.5%) */
  DEFAULT_SLIPPAGE: 0.005,
} as const;

// ─── Deployed Contract Addresses ──────────────────────────────────────────────

/**
 * PayStream on-chain contract addresses.
 * Populated from environment variables set by the deploy script.
 * Testnet addresses are filled after `scripts/deploy-contracts.sh` runs.
 */
export const PAYSTREAM_CONTRACTS = {
  testnet: {
    vault: process.env.VAULT_CONTRACT ?? "",
    escrow: process.env.ESCROW_CONTRACT ?? "",
    registry: process.env.REGISTRY_CONTRACT ?? "",
  },
  mainnet: {
    vault: "", // post-mainnet-audit
    escrow: "",
    registry: "",
  },
} as const;

// ─── Error Codes ───────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  AMOUNT_MISMATCH: "AMOUNT_MISMATCH",
  RECIPIENT_MISMATCH: "RECIPIENT_MISMATCH",
  PAYMENT_EXPIRED: "PAYMENT_EXPIRED",
  SETTLEMENT_FAILED: "SETTLEMENT_FAILED",
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  STREAM_NOT_FOUND: "STREAM_NOT_FOUND",
  STREAM_EXPIRED: "STREAM_EXPIRED",
  SWAP_FAILED: "SWAP_FAILED",
  UNSUPPORTED_TOKEN: "UNSUPPORTED_TOKEN",
  NETWORK_MISMATCH: "NETWORK_MISMATCH",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

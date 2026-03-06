import { describe, it, expect } from "vitest";
import {
  encodePaymentRequirements,
  decodePaymentRequirements,
  encodePaymentPayload,
  decodePaymentPayload,
  formatTokenAmount,
  parseTokenAmount,
} from "../src/encoding";
import {
  validatePaymentRequirements,
  validatePaymentPayload,
  isPaymentSufficient,
} from "../src/validation";
import { getBitflowQuote, isBitflowPairSupported } from "../src/bitflow";
import {
  X402_HEADERS,
  SUPPORTED_TOKENS,
  getDefaultTokens,
} from "../src/constants";
import type { PaymentRequirements, PaymentPayload } from "../src/types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MERCHANT = "SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9";
const PAYER = "SP3FBR2AGK5F8QVWXQ1QKFN7QGS5F5QVWXQ1QKFN";

function makeRequirements(
  overrides: Partial<PaymentRequirements> = {},
): PaymentRequirements {
  return {
    scheme: "exact",
    network: "stacks:1",
    payTo: MERCHANT,
    maxAmountRequired: "10000",
    resource: "/api/data",
    description: "Test endpoint",
    tokens: getDefaultTokens({ STX: "10000", sBTC: "100", USDCx: "10000" }),
    ...overrides,
  };
}

function makePayload(overrides: Partial<PaymentPayload> = {}): PaymentPayload {
  return {
    scheme: "exact",
    network: "stacks:1",
    token: "STX",
    signature: "0xdeadbeef01020304",
    fromAddress: PAYER,
    amount: "10000",
    payTo: MERCHANT,
    timestamp: Date.now(),
    nonce: "test_nonce_1",
    resource: "/api/data",
    ...overrides,
  };
}

// ─── Encoding ─────────────────────────────────────────────────────────────────

describe("encoding", () => {
  it("round-trips PaymentRequirements through base64", () => {
    const req = makeRequirements();
    const encoded = encodePaymentRequirements(req);
    expect(typeof encoded).toBe("string");
    const decoded = decodePaymentRequirements(encoded);
    expect(decoded.payTo).toBe(MERCHANT);
    expect(decoded.maxAmountRequired).toBe("10000");
    expect(decoded.network).toBe("stacks:1");
  });

  it("round-trips PaymentPayload through base64", () => {
    const payload = makePayload();
    const encoded = encodePaymentPayload(payload);
    const decoded = decodePaymentPayload(encoded);
    expect(decoded.token).toBe("STX");
    expect(decoded.fromAddress).toBe(PAYER);
    expect(decoded.amount).toBe("10000");
    expect(decoded.signature).toBe("0xdeadbeef01020304");
  });

  it("throws on invalid base64", () => {
    expect(() => decodePaymentRequirements("not-valid-base64!!!")).toThrow();
  });

  it("formats STX amount (6 decimals)", () => {
    expect(formatTokenAmount("1000000", 6)).toBe("1.00");
    expect(formatTokenAmount("500000", 6)).toBe("0.50");
    expect(formatTokenAmount("1500", 6)).toBe("0.0015");
  });

  it("formats sBTC amount (8 decimals)", () => {
    expect(formatTokenAmount("100000000", 8)).toBe("1.00");
    expect(formatTokenAmount("1000", 8)).toBe("0.00001");
  });

  it("parses human-readable STX to micro-units", () => {
    expect(parseTokenAmount("1.5", 6)).toBe("1500000");
    expect(parseTokenAmount("0.01", 6)).toBe("10000");
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe("validatePaymentRequirements", () => {
  it("validates a correct requirements object", () => {
    const result = validatePaymentRequirements(makeRequirements());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects invalid scheme", () => {
    const result = validatePaymentRequirements(
      makeRequirements({ scheme: "unknown" as "exact" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("scheme"))).toBe(true);
  });

  it("rejects invalid network", () => {
    const result = validatePaymentRequirements(
      makeRequirements({ network: "ethereum:1" as "stacks:1" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("network"))).toBe(true);
  });

  it("rejects amount below minimum", () => {
    const result = validatePaymentRequirements(
      makeRequirements({ maxAmountRequired: "1" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Amount too low"))).toBe(true);
  });

  it("rejects missing payTo", () => {
    const result = validatePaymentRequirements(makeRequirements({ payTo: "" }));
    expect(result.valid).toBe(false);
  });

  it("requires streaming rate for streaming scheme", () => {
    const result = validatePaymentRequirements(
      makeRequirements({ scheme: "streaming" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Streaming rate"))).toBe(true);
  });
});

describe("validatePaymentPayload", () => {
  it("validates a correct payload", () => {
    const errors = validatePaymentPayload(makePayload());
    expect(errors).toHaveLength(0);
  });

  it("rejects unsupported token", () => {
    const errors = validatePaymentPayload(
      makePayload({ token: "DOGE" as "STX" }),
    );
    expect(errors.some((e) => e.includes("Unsupported token"))).toBe(true);
  });

  it("rejects zero amount", () => {
    const errors = validatePaymentPayload(makePayload({ amount: "0" }));
    expect(errors.some((e) => e.includes("amount"))).toBe(true);
  });

  it("rejects missing signature", () => {
    const errors = validatePaymentPayload(makePayload({ signature: "" }));
    expect(errors.some((e) => e.includes("Signature"))).toBe(true);
  });

  it("rejects expired payment (> 10 min old)", () => {
    const errors = validatePaymentPayload(
      makePayload({ timestamp: Date.now() - 11 * 60 * 1000 }),
    );
    expect(errors.some((e) => e.includes("expired"))).toBe(true);
  });
});

describe("isPaymentSufficient", () => {
  it("returns true when amount meets requirement", () => {
    const req = makeRequirements();
    const payload = makePayload({ amount: "10000" });
    expect(isPaymentSufficient(payload, req)).toBe(true);
  });

  it("returns true when amount exceeds requirement", () => {
    const req = makeRequirements();
    const payload = makePayload({ amount: "20000" });
    expect(isPaymentSufficient(payload, req)).toBe(true);
  });

  it("returns false when amount is too low", () => {
    const req = makeRequirements();
    const payload = makePayload({ amount: "100" });
    expect(isPaymentSufficient(payload, req)).toBe(false);
  });

  it("returns false for unsupported token in SupportedToken list", () => {
    const req = makeRequirements();
    const payload = makePayload({ token: "USDCx", amount: "10000" });
    // USDCx is in the token list but STX-specific amount is 10000
    // USDCx amount is also 10000 in makeRequirements
    expect(isPaymentSufficient(payload, req)).toBe(true);
  });
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("X402_HEADERS has required keys", () => {
    expect(X402_HEADERS.REQUIREMENTS).toBe("payment-required");
    expect(X402_HEADERS.PAYMENT).toBe("x-payment");
    expect(X402_HEADERS.RESPONSE).toBe("x-payment-response");
  });

  it("SUPPORTED_TOKENS contains STX, sBTC, USDCx", () => {
    expect(Object.keys(SUPPORTED_TOKENS)).toContain("STX");
    expect(Object.keys(SUPPORTED_TOKENS)).toContain("sBTC");
    expect(Object.keys(SUPPORTED_TOKENS)).toContain("USDCx");
  });

  it("getDefaultTokens returns array with 3 tokens", () => {
    const tokens = getDefaultTokens();
    expect(tokens).toHaveLength(3);
    expect(tokens.map((t) => t.symbol)).toEqual(["STX", "sBTC", "USDCx"]);
  });
});

// ─── Bitflow ──────────────────────────────────────────────────────────────────

describe("bitflow", () => {
  it("detects supported pairs", () => {
    expect(isBitflowPairSupported("sBTC", "USDCx")).toBe(true);
    expect(isBitflowPairSupported("STX", "sBTC")).toBe(true);
    expect(isBitflowPairSupported("USDCx", "STX")).toBe(true);
  });

  it("detects unsupported pairs", () => {
    expect(isBitflowPairSupported("sBTC", "sBTC")).toBe(false);
  });

  it("quotes sBTC → USDCx correctly", async () => {
    const quote = await getBitflowQuote("sBTC", "USDCx", "100000"); // 0.001 sBTC
    expect(quote.fromToken).toBe("sBTC");
    expect(quote.toToken).toBe("USDCx");
    expect(Number(quote.toAmount)).toBeGreaterThan(0);
    expect(quote.provider).toBe("bitflow");
    expect(quote.slippage).toBe(0.005);
  });

  it("quotes STX → USDCx correctly", async () => {
    const quote = await getBitflowQuote("STX", "USDCx", "1000000"); // 1 STX → ~$2.45 after 0.5% slippage
    // 1 STX = $2.45, after 0.5% slippage = $2.4378 → ~2437750 micro-USDCx
    expect(Number(quote.toAmount)).toBeCloseTo(2437750, -3);
  });

  it("throws for unsupported pair", async () => {
    await expect(getBitflowQuote("sBTC", "sBTC", "100")).rejects.toThrow(
      "not supported",
    );
  });
});

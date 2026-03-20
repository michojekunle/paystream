import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentWallet } from "../src/agent-wallet";
import { X402_HEADERS, encodePaymentRequirements } from "@paystream/core";

// We don't want to actually build Stacks transactions in testing to save time,
// so we mock the heavy crypto imports.
vi.mock("@stacks/transactions", () => ({
  getAddressFromPrivateKey: vi.fn(() => "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"),
  TransactionVersion: {
    Mainnet: 1,
    Testnet: 2,
  },
}));

vi.mock("../src/signer", () => ({
  buildPaymentTransaction: vi.fn().mockResolvedValue({ serializedTx: "mocked-tx-hex" }),
}));

describe("AgentWallet", () => {
  const MOCK_KEY = "72846...mocked-key"; 

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles a normal 200 OK response without modifications", async () => {
    const mockGlobalFetch = vi.fn().mockResolvedValue(new Response("success", { status: 200 }));
    vi.stubGlobal("fetch", mockGlobalFetch);

    const agent = new AgentWallet({
      key: MOCK_KEY,
      budget: { perTx: 5000n, perDay: 10000n },
    });

    const response = await agent.fetch("http://localhost/api/free");
    expect(response.status).toBe(200);
    expect(mockGlobalFetch).toHaveBeenCalledTimes(1);
  });

  it("intercepts a 402 response, signs payment, and retries", async () => {
    const requirements = encodePaymentRequirements({
      scheme: "exact",
      network: "testnet",
      maxAmountRequired: "1000",
      resource: "http://localhost/api/ai",
      tokens: [{ symbol: "STX", amount: "1000", decimals: 6 }],
      payTo: "ST...MERCHANT",
      description: "AI Gen",
    });

    const response402 = new Response("Payment Required", {
      status: 402,
      headers: {
        [X402_HEADERS.REQUIREMENTS]: requirements,
      },
    });

    const response200 = new Response("AI Data", { status: 200 });

    const mockGlobalFetch = vi
      .fn()
      .mockResolvedValueOnce(response402) // first call gets 402
      .mockResolvedValueOnce(response200); // retry gets 200

    vi.stubGlobal("fetch", mockGlobalFetch);

    const agent = new AgentWallet({
      key: MOCK_KEY,
      budget: { perTx: 5000n, perDay: 10000n, tokens: ["STX"] },
    });

    const response = await agent.fetch("http://localhost/api/ai");
    expect(response.status).toBe(200);
    expect(mockGlobalFetch).toHaveBeenCalledTimes(2);

    // Assert second fetch had the payment signature header
    const secondCallParams = mockGlobalFetch.mock.calls[1];
    const headers = secondCallParams[1].headers as Headers;
    expect(headers.has(X402_HEADERS.PAYMENT)).toBe(true);
    
    // Check spend log
    expect(agent.getLog()).toHaveLength(1);
    expect(agent.getRemainingBudget().daily).toBe(9000n);
  });

  it("throws if perTx budget is exceeded", async () => {
    const requirements = encodePaymentRequirements({
      scheme: "exact",
      network: "testnet",
      maxAmountRequired: "10000", // requires 10k
      resource: "http://localhost/api/expensive",
      tokens: [{ symbol: "STX", amount: "10000", decimals: 6 }],
      payTo: "ST...MERCHANT",
      description: "Expensive API",
    });

    const response402 = new Response("Payment Required", {
      status: 402,
      headers: {
        [X402_HEADERS.REQUIREMENTS]: requirements,
      },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response402));

    const agent = new AgentWallet({
      key: MOCK_KEY,
      budget: { perTx: 5000n, perDay: 20000n }, // max 5k per tx
    });

    await expect(agent.fetch("http://localhost/api/expensive")).rejects.toThrow(/exceeds per-tx limit/);
  });
});

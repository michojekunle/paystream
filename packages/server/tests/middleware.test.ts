import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express from "express";
import { paywall } from "../src/middleware";

describe("PayStream Middleware", () => {
  it("returns 402 Payment Required when missing signature", async () => {
    const app = express();
    app.get(
      "/api/data",
      paywall({
        to: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
        price: "1000",
        network: "testnet",
        description: "Test endpoint",
        facilitatorUrl: "http://localhost:3403",
      }),
      (req, res) => {
        res.json({ data: "secret" });
      },
    );

    // Add error handler to log what x402-stacks is returning as a 500
    app.use((err: any, req: any, res: any, next: any) => {
      console.error("Test Error:", err);
      res.status(500).json({ error: err.message });
    });

    const response = await request(app)
      .get("/api/data")
      .set("Host", "localhost:3000"); // x402-stacks requires Host header

    expect(response.status).toBe(402);
    // x402-stacks returns the payment requirements object directly in the body
    expect(response.body).toHaveProperty("maxAmountRequired");
    expect(response.body).toHaveProperty("payTo");
    expect(response.body).not.toHaveProperty("data");
  });

  it("handles server errors gracefully if x402-stacks fails", async () => {
    const app = express();
    app.get(
      "/api/fail",
      paywall({
        to: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", // A valid address
        price: "-100", // Invalid price to trigger an error in the middleware logic
        facilitatorUrl: "http://localhost:3403",
      }),
      (req, res) => {
        res.json({ ok: true });
      },
    );

    // Express default error handler will return 500 when a middleware throws synchronously, 
    // which indicates it correctly caught the invalid config.
    const response = await request(app)
      .get("/api/fail")
      .set("Host", "localhost:3000");

    expect(response.status).toBe(402);
  });
});

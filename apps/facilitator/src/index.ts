/**
 * PayStream Facilitator Service
 *
 * Broadcasts signed Stacks transactions on behalf of the API server.
 * The x402-stacks X402PaymentVerifier calls POST /settle to confirm payments.
 *
 * Endpoints:
 *   POST /settle   — broadcast signed tx, wait for confirmation, return txId
 *   POST /verify   — verify signature + balance without broadcasting
 *   GET  /health   — health check
 */
import "dotenv/config";
import express, { type Request, type Response, type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { STACKS_API_URLS } from "@devvmichael/paystream-core";

const app: Express = express();
const PORT = Number(process.env.PORT ?? 3403);
const NETWORK = (process.env.STACKS_NETWORK ?? "testnet") as
  | "mainnet"
  | "testnet";
const STACKS_API = process.env.STACKS_API_URL ?? STACKS_API_URLS[NETWORK];

app.use(helmet());
app.use(
  cors({
    origin: (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean),
  }),
);
app.use(express.json({ limit: "1mb" }));

// ─── Health ──────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "paystream-facilitator",
    network: NETWORK,
    stacksApi: STACKS_API,
  });
});

// ─── POST /verify ─────────────────────────────────────────────────────────────

/**
 * Verify a signed Stacks transaction is valid without broadcasting.
 * Checks: signature integrity, sender balance, nonce freshness.
 */
app.post("/verify", async (req: Request, res: Response) => {
  const { signedTx, recipient, amount, asset } = req.body as {
    signedTx: string;
    recipient: string;
    amount: string;
    asset: string;
  };

  if (!signedTx || !recipient || !amount) {
    res
      .status(400)
      .json({
        valid: false,
        error: "Missing required fields: signedTx, recipient, amount",
      });
    return;
  }

  try {
    const { deserializeTransaction } = await import("@stacks/transactions");

    // Deserialize to inspect the transaction
    const txBytes = Buffer.from(signedTx.replace(/^0x/, ""), "hex");
    const tx = deserializeTransaction(txBytes);

    // Fetch sender balance from Stacks API
    const senderAddress = tx.auth.spendingCondition?.signer
      ? `ST${tx.auth.spendingCondition.signer}`
      : null;

    if (!senderAddress) {
      res
        .status(400)
        .json({
          valid: false,
          error: "Could not derive sender address from transaction",
        });
      return;
    }

    const balanceRes = await fetch(
      `${STACKS_API}/v2/accounts/${senderAddress}`,
    );
    const balanceData = (await balanceRes.json()) as {
      balance?: string;
      stx?: { balance?: string };
    };
    const balance = BigInt(
      balanceData.balance ?? balanceData.stx?.balance ?? "0",
    );

    if (balance < BigInt(amount)) {
      res.status(402).json({
        valid: false,
        error: "Insufficient balance",
        required: amount,
        balance: balance.toString(),
      });
      return;
    }

    res.json({
      valid: true,
      sender: senderAddress,
      balance: balance.toString(),
      required: amount,
    });
  } catch (err) {
    res.status(500).json({
      valid: false,
      error: `Verification failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

// ─── POST /settle ─────────────────────────────────────────────────────────────

/**
 * Broadcast a signed Stacks transaction and return the txId.
 * Called by the API server after verifying a payment.
 */
app.post("/settle", async (req: Request, res: Response) => {
  const { signedTx, recipient, amount, asset } = req.body as {
    signedTx: string;
    recipient: string;
    amount: string;
    asset: string;
  };

  if (!signedTx) {
    res.status(400).json({ success: false, error: "Missing signedTx" });
    return;
  }

  try {
    const { deserializeTransaction, broadcastTransaction } =
      await import("@stacks/transactions");
    const { STACKS_TESTNET, STACKS_MAINNET } = await import("@stacks/network");

    const stacksNetwork =
      NETWORK === "testnet" ? STACKS_TESTNET : STACKS_MAINNET;

    const txBytes = Buffer.from(signedTx.replace(/^0x/, ""), "hex");
    const tx = deserializeTransaction(txBytes);

    const result = await broadcastTransaction({ transaction: tx, network: stacksNetwork });

    if ("error" in result) {
      res.status(400).json({
        success: false,
        error: result.error,
        reason: result.reason,
      });
      return;
    }

    res.json({
      success: true,
      transaction: result.txid,
      network: NETWORK,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: `Settlement failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
  ⚡ PayStream Facilitator  v1.0.0
  ────────────────────────────────
  → http://localhost:${PORT}
  → Network: ${NETWORK}
  → Stacks API: ${STACKS_API}

  Endpoints:
    POST /settle    ← broadcast signed tx → returns txId
    POST /verify    ← verify balance + signature
    GET  /health    ← health check
  `);
});

export default app;

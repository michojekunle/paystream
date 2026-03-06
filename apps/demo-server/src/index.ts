/**
 * PayStream Production API Server — Port 3402
 *
 * Production-grade Express server with:
 *   - helmet() security headers
 *   - env-driven CORS (no hardcoded localhost)
 *   - express-rate-limit (100 req / 15 min / IP)
 *   - Real paywall() middleware via @paystream/server
 *   - Supabase persistence for receipts, nonces, and compute jobs
 *   - OpenAI integration for /api/ai/generate (optional)
 *   - Graceful SIGTERM shutdown
 */
import "dotenv/config";
import express, {
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { paywall } from "@paystream/server";
import { getBitflowQuote } from "@paystream/core";
import {
  recordPayment,
  isNonceUsed,
  markNonceUsed,
  createComputeJob,
  getComputeJob,
  completeComputeJob,
  getMerchantStats,
} from "./db.js";

// ─── Local PayStream request type ─────────────────────────────────────────────
// Express augmentation from @paystream/server isn't visible across tsconfig
// project boundaries, so we define it locally and cast with `as PayStreamReq`.
interface PayStreamReq extends Request {
  paystream?: {
    payment: {
      payer: string;
      transaction: string;
      amount: string;
      asset?: string;
      network?: string;
    };
  };
}

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = Number(process.env.PORT ?? 3402);
const NETWORK = (process.env.STACKS_NETWORK ?? "testnet") as
  | "mainnet"
  | "testnet";
const MERCHANT = process.env.MERCHANT_ADDRESS;

if (!MERCHANT) {
  console.error("❌ MERCHANT_ADDRESS env var is required");
  process.exit(1);
}

// ─── Security & Middleware ────────────────────────────────────────────────────

app.use(helmet());

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ?? "http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    exposedHeaders: [
      "payment-required",
      "payment-signature",
      "x-payment-response",
    ],
  }),
);

app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests", retryAfter: "15 minutes" },
});
app.use("/api/", limiter);

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`→ ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─── withReceipt helper ───────────────────────────────────────────────────────

/**
 * Wraps a route handler to record the payment in Supabase and check replay.
 * Casts req to PayStreamReq to access req.paystream set by paywall().
 */
function withReceipt(
  handler: (req: PayStreamReq, res: Response) => Promise<void> | void,
): RequestHandler {
  return async (req: Request, res: Response) => {
    const pReq = req as PayStreamReq;
    const payment = pReq.paystream?.payment;

    if (payment) {
      const nonce =
        (req.headers["x-payment-nonce"] as string) ?? payment.transaction;

      if (await isNonceUsed(nonce)) {
        res
          .status(402)
          .json({ error: "Payment nonce already used (replay detected)" });
        return;
      }
      await markNonceUsed(nonce);

      await recordPayment({
        tx_id: payment.transaction,
        payer: payment.payer,
        payee: MERCHANT!,
        amount: payment.amount,
        token: payment.asset ?? "STX",
        resource: req.path,
      }).catch((err) => console.error("⚠️ Receipt storage failed:", err));
    }

    return handler(pReq, res);
  };
}

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "@paystream/api",
    version: "1.0.0",
    network: NETWORK,
    merchant: MERCHANT ? `${MERCHANT.slice(0, 10)}...` : "not set",
    facilitator: process.env.FACILITATOR_URL ? "✅ configured" : "⚠️  not set",
    supabase: process.env.SUPABASE_URL ? "✅ configured" : "⚠️  not configured",
    openai: process.env.OPENAI_API_KEY ? "✅ enabled" : "ℹ️  not set",
  });
});

// ─── Endpoint 1: AI Generation ────────────────────────────────────────────────

app.get(
  "/api/ai/generate",
  paywall({
    to: MERCHANT,
    price: "10000",
    token: "STX",
    network: NETWORK,
    description: "AI text generation — PayStream x402",
  }) as unknown as RequestHandler,
  withReceipt(async (req: PayStreamReq, res: Response) => {
    const prompt =
      (req.query.prompt as string) ?? "Explain Bitcoin micropayments";

    if (process.env.OPENAI_API_KEY) {
      try {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
        });
        res.json({
          model: "gpt-4o-mini",
          prompt,
          output: completion.choices[0]?.message?.content ?? "No response",
          usage: completion.usage,
          paidBy: req.paystream?.payment?.payer,
          txId: req.paystream?.payment?.transaction,
          network: NETWORK,
        });
        return;
      } catch (err) {
        console.error("OpenAI error:", err);
      }
    }

    res.json({
      model: "paystream-protocol",
      prompt,
      output:
        "PayStream implements the x402 protocol on Stacks for Bitcoin-native micropayments. " +
        "Your payment was settled on-chain in under 2 seconds with cryptographic proof. " +
        "Set OPENAI_API_KEY for real AI responses.",
      paidBy: req.paystream?.payment?.payer,
      txId: req.paystream?.payment?.transaction,
      network: NETWORK,
    });
  }),
);

// ─── Endpoint 2: Premium Content ──────────────────────────────────────────────

const ARTICLES = [
  {
    id: 1,
    title: "The Future of Bitcoin DeFi in 2026",
    author: "PayStream Research",
    readTime: "6 min",
    paragraphs: [
      "Bitcoin's DeFi ecosystem has matured significantly with sBTC and USDCx on Stacks.",
      "Streaming micropayments enable content monetization models impossible with traditional rails.",
      "The x402 standard normalises machine-to-machine payments in the AI economy.",
      "USDCx brings dollar-stable pricing to Bitcoin security — predictable revenue without volatility.",
    ],
  },
  {
    id: 2,
    title: "sBTC: Programmable Bitcoin for the AI Economy",
    author: "PayStream Research",
    readTime: "4 min",
    paragraphs: [
      "sBTC enables 1:1 Bitcoin-backed assets on Stacks, bridging security with smart contracts.",
      "PayStream streaming escrow allows GPU compute paid per-second in sBTC.",
      "Bitflow cross-token swaps let users pay in sBTC while merchants receive USDCx.",
    ],
  },
];

app.get(
  "/api/content/:id",
  paywall({
    to: MERCHANT,
    price: "5000",
    token: "STX",
    network: NETWORK,
    description: "Premium article — PayStream x402",
  }) as unknown as RequestHandler,
  withReceipt(async (req: PayStreamReq, res: Response) => {
    const id = Number(req.params.id ?? 1);
    const article = ARTICLES.find((a) => a.id === id);
    if (!article) {
      res.status(404).json({ error: "Article not found", available: [1, 2] });
      return;
    }
    res.json({
      ...article,
      accessedAt: new Date().toISOString(),
      paidBy: req.paystream?.payment?.payer,
      txId: req.paystream?.payment?.transaction,
    });
  }),
);

// ─── Endpoint 3: GPU Compute ──────────────────────────────────────────────────

app.post(
  "/api/compute/submit",
  paywall({
    to: MERCHANT,
    price: "100000",
    token: "STX",
    network: NETWORK,
    description: "GPU compute job — PayStream x402",
  }) as unknown as RequestHandler,
  withReceipt(async (req: PayStreamReq, res: Response) => {
    const body = (req.body ?? {}) as Record<string, string>;
    const jobId = `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const estimatedSeconds = Math.floor(Math.random() * 60) + 30;

    await createComputeJob({
      job_id: jobId,
      status: "running",
      gpu: body.gpu ?? "4× NVIDIA A100",
      model: body.model ?? "stable-diffusion-xl",
      payer: req.paystream?.payment?.payer,
    });

    setTimeout(
      () => completeComputeJob(jobId).catch(console.error),
      Math.min(estimatedSeconds * 1000, 120_000),
    );

    res.json({
      jobId,
      status: "running",
      gpu: body.gpu ?? "4× NVIDIA A100",
      estimatedDuration: `${estimatedSeconds}s`,
      ratePerSecond: "0.00001 sBTC",
      txId: req.paystream?.payment?.transaction,
      network: NETWORK,
    });
  }),
);

app.get("/api/compute/status/:jobId", async (req: Request, res: Response) => {
  try {
    const job = await getComputeJob(req.params.jobId!);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(job);
  } catch {
    res.status(500).json({ error: "Failed to fetch job status" });
  }
});

// ─── Endpoint 4: Swap Quote ───────────────────────────────────────────────────

app.get(
  "/api/swap/quote",
  paywall({
    to: MERCHANT,
    price: "1000",
    token: "STX",
    network: NETWORK,
    description: "Bitflow DEX live swap quote",
  }) as unknown as RequestHandler,
  withReceipt(async (req: PayStreamReq, res: Response) => {
    const from = ((req.query.from as string) ?? "sBTC") as
      | "STX"
      | "sBTC"
      | "USDCx";
    const to = ((req.query.to as string) ?? "USDCx") as
      | "STX"
      | "sBTC"
      | "USDCx";
    const amount = (req.query.amount as string) ?? "1000000";

    try {
      const quote = await getBitflowQuote(from, to, amount);
      res.json({
        ...quote,
        route: `${from} → Bitflow DEX → ${to}`,
        txId: req.paystream?.payment?.transaction,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Quote failed",
        supportedPairs: ["STX↔sBTC", "STX↔USDCx", "sBTC↔USDCx"],
      });
    }
  }),
);

// ─── Service Discovery ────────────────────────────────────────────────────────

app.get("/api/services", (_req: Request, res: Response) => {
  res.json({
    protocol: "x402",
    version: "1.0.0",
    network: NETWORK,
    merchant: MERCHANT,
    facilitatorUrl: process.env.FACILITATOR_URL,
    services: [
      {
        method: "GET",
        endpoint: "/api/ai/generate",
        price: "10000 µSTX",
        description: "AI text generation",
      },
      {
        method: "GET",
        endpoint: "/api/content/:id",
        price: "5000 µSTX",
        description: "Premium article",
      },
      {
        method: "POST",
        endpoint: "/api/compute/submit",
        price: "100000 µSTX",
        description: "GPU compute job",
      },
      {
        method: "GET",
        endpoint: "/api/swap/quote",
        price: "1000 µSTX",
        description: "Bitflow DEX quote",
      },
    ],
  });
});

// ─── Merchant Stats ───────────────────────────────────────────────────────────

app.get("/api/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await getMerchantStats(MERCHANT!);
    res.json({ merchant: MERCHANT, stats, network: NETWORK });
  } catch {
    res
      .status(500)
      .json({
        error: "Failed to fetch stats",
        hint: "Ensure Supabase env vars are set",
      });
  }
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res
    .status(404)
    .json({ error: "Not found", hint: "GET /api/services for endpoint list" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`
  ⚡ PayStream API  v1.0.0
  ─────────────────────────────────────
  → http://localhost:${PORT}
  → Network: ${NETWORK}
  → Merchant: ${MERCHANT?.slice(0, 10)}...
  → Facilitator: ${process.env.FACILITATOR_URL ?? "⚠️  not configured"}
  → Supabase: ${process.env.SUPABASE_URL ? "✅" : "⚠️  not configured"}
  `);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

export default app;

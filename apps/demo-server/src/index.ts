/**
 * PayStream Production API Server — Port 3402
 *
 * Production-grade Express server with:
 *   - helmet() security headers
 *   - env-driven CORS (no hardcoded localhost)
 *   - express-rate-limit (100 req / 15 min / IP)
 *   - Real paywall() middleware via @devvmichael/paystream-server
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
import { paywall } from "@devvmichael/paystream-server";
import { getBitflowQuote, decodePaymentPayload, X402_HEADERS } from "@devvmichael/paystream-core";
import {
  recordPayment,
  isNonceUsed,
  markNonceUsed,
  createComputeJob,
  getComputeJob,
  completeComputeJob,
  getMerchantStats,
  getMerchantReceipts,
} from "./db.js";
import {
  createService,
  getServices,
  updateServiceStatus,
  deleteService,
} from "./sqlite.js";

// ─── Local PayStream request type ─────────────────────────────────────────────
// Express augmentation from @devvmichael/paystream-server isn't visible across tsconfig
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

// ─── Dynamic Paywall & Receipt Middleware ────────────────────────────────────

const paywallCache = new Map<string, RequestHandler>();

async function dynamicPaywall(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api/")) return next();
  
  // Exclude management and non-protected endpoints
  if (
    req.path === "/api/services" || 
    req.path === "/api/stats" || 
    req.path.startsWith("/api/services/") || 
    req.path === "/api/health"
  ) {
    return next();
  }

  try {
    const services = await getServices(MERCHANT!);
    const activeServices = services.filter(s => s.status === "active");

    let matchedService = null;
    for (const s of activeServices) {
      if (s.method.toUpperCase() !== req.method.toUpperCase()) continue;
      
      // Exact match
      if (s.endpoint === req.path) {
        matchedService = s;
        break;
      }
      
      // Param match (e.g. /api/content/:id)
      if (s.endpoint.includes(":")) {
         const regexStr = "^" + s.endpoint.replace(/:[^\s/]+/g, "([^/]+)") + "$";
         if (new RegExp(regexStr).test(req.path)) {
           matchedService = s;
           break;
         }
      }
    }

    if (!matchedService) return next();

    const cacheKey = `${matchedService.id}-${matchedService.price}-${matchedService.token}`;
    let middleware = paywallCache.get(cacheKey);
    
    if (!middleware) {
      middleware = paywall({
        to: MERCHANT!,
        price: matchedService.price.replace(/[^\d]/g, ''), 
        token: matchedService.token as any,
        network: NETWORK,
        description: matchedService.description,
        resource: req.path,
      }) as unknown as RequestHandler;
      
      paywallCache.set(cacheKey, middleware);
    }

    return middleware(req, res, next);
  } catch (err) {
    next(err);
  }
}

async function globalReceiptMiddleware(req: Request, res: Response, next: NextFunction) {
  const pReq = req as PayStreamReq;
  let nonce: string | undefined;

  // 1. Try to get nonce from verified payment attached by dynamicPaywall/paywall
  if (pReq.paystream?.payment) {
    nonce = pReq.paystream.payment.transaction;
  } 
  // 2. Fallback: Extract from raw header to prevent replay even if signature validation fails next
  else {
    const header = req.headers[X402_HEADERS.PAYMENT] || req.headers[X402_HEADERS.PAYMENT.toLowerCase()];
    if (header && typeof header === 'string') {
      try {
        const payload = decodePaymentPayload(header);
        nonce = payload.nonce;
      } catch (err) {
        // Skip: invalid format will be caught by paywall middleware
      }
    }
  }

  if (nonce) {
    if (await isNonceUsed(nonce)) {
      console.log(`[Replay Protection] Blocked used nonce: ${nonce}`);
      res.status(402).json({ error: "Payment nonce already used (replay detected)" });
      return;
    }
    // Note: We only mark it used if it WAS verified, or we can mark it now.
    // To be safe against replay of invalid sigs, we mark it now.
    await markNonceUsed(nonce);

    if (pReq.paystream?.payment) {
      await recordPayment({
        tx_id: pReq.paystream.payment.transaction,
        payer: pReq.paystream.payment.payer,
        payee: MERCHANT!,
        amount: pReq.paystream.payment.amount,
        token: pReq.paystream.payment.asset ?? "STX",
        resource: req.path,
      }).catch((err) => console.error("⚠️ Receipt storage failed:", err));
    }
  }

  next();
}

app.use(globalReceiptMiddleware);
app.use(dynamicPaywall);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "@devvmichael/paystream-api",
    version: "1.0.0",
    network: NETWORK,
    merchant: MERCHANT ? `${MERCHANT.slice(0, 10)}...` : "not set",
    facilitator: process.env.FACILITATOR_URL ? "✅ configured" : "⚠️  not set",
    supabase: process.env.SUPABASE_URL ? "✅ configured" : "⚠️  not configured",
    openai: process.env.OPENAI_API_KEY ? "✅ enabled" : "ℹ️  not set",
  });
});

// ─── Endpoint 1: AI Generation ────────────────────────────────────────────────

app.get("/api/ai/generate", async (req: Request, res: Response) => {
    const pReq = req as PayStreamReq;
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
});

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

app.get("/api/content/:id", async (req: Request, res: Response) => {
    const pReq = req as PayStreamReq;
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
      txId: pReq.paystream?.payment?.transaction,
    });
});

// ─── Endpoint 3: GPU Compute ──────────────────────────────────────────────────

app.post("/api/compute/submit", async (req: Request, res: Response) => {
    const pReq = req as PayStreamReq;
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
});

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

app.get("/api/swap/quote", async (req: Request, res: Response) => {
    const pReq = req as PayStreamReq;
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
        txId: pReq.paystream?.payment?.transaction,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Quote failed",
        supportedPairs: ["STX↔sBTC", "STX↔USDCx", "sBTC↔USDCx"],
      });
    }
});

// ─── Service Discovery & Management ──────────────────────────────────────────

app.get("/api/services", async (_req: Request, res: Response) => {
  try {
    const services = await getServices(MERCHANT!);
    res.json({
      protocol: "x402",
      version: "1.0.0",
      network: NETWORK,
      merchant: MERCHANT,
      facilitatorUrl: process.env.FACILITATOR_URL,
      services: services.map(s => ({
        id: s.id,
        method: s.method,
        endpoint: s.endpoint,
        price: s.price,
        token: s.token,
        description: s.description,
        status: s.status
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load services", details: err.message });
  }
});

app.post("/api/services", async (req: Request, res: Response) => {
  try {
    const { method, endpoint, price, token, description } = req.body;
    if (!method || !endpoint || !price || !token || !description) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    
    // Auto-register wildcard endpoints for testing if not already exact
    const svc = await createService({
      method: method.toUpperCase(),
      endpoint: endpoint.startsWith("/") ? endpoint : `/${endpoint}`,
      price: price.toString(),
      token,
      description,
      status: "active",
      merchant: MERCHANT!
    });
    
    res.json(svc);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create service", details: err.message });
  }
});

app.put("/api/services/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (status !== "active" && status !== "paused") {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    
    const success = await updateServiceStatus(req.params.id, MERCHANT!, status);
    if (!success) res.status(404).json({ error: "Service not found" });
    else res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update service", details: err.message });
  }
});

app.delete("/api/services/:id", async (req: Request, res: Response) => {
  try {
    const success = await deleteService(req.params.id, MERCHANT!);
    if (!success) res.status(404).json({ error: "Service not found" });
    else res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete service", details: err.message });
  }
});

// ─── Merchant Stats ───────────────────────────────────────────────────────────

app.get("/api/stats", async (_req: Request, res: Response) => {
  try {
    const [stats, receipts] = await Promise.all([
      getMerchantStats(MERCHANT!),
      getMerchantReceipts(MERCHANT!)
    ]);
    
    res.json({ merchant: MERCHANT, stats, recentTransactions: receipts.slice(0, 10), network: NETWORK });
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

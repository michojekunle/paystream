/**
 * @paystream/server — Production Express middleware for x402 payments
 *
 * Wraps x402-stacks `paymentMiddleware` with PayStream's receipt layer:
 *   1. Delegates full x402 protocol handling to x402-stacks
 *   2. Attaches req.paystream.payment with payment info from getPayment()
 *   3. Returns a single Express middleware (not an array) for drop-in usage
 *
 * Usage:
 *   app.get('/api/data', paywall({ to, price }), handler)
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
/**
 * Represents the payment information attached to req.paystream
 * by the paywall() middleware after successful x402 verification.
 */
export interface SettledPayment {
  /** Payer's Stacks address */
  payer: string;
  /** On-chain transaction ID */
  transaction: string;
  /** Amount paid in micro-units */
  amount: string;
  /** Token/asset identifier (e.g. 'STX', 'sBTC') */
  asset?: string;
  /** Network identifier */
  network?: string;
}

// Extend Express Request with PayStream payment info
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      paystream?: {
        payment: SettledPayment;
      };
    }
  }
}

export interface PaywallConfig {
  /** Merchant Stacks address */
  to: string;
  /** Price in micro-units (micro-STX, satoshis, or micro-USDCx) */
  price: string | bigint;
  /** Token type — defaults to STX */
  token?: "STX" | "sBTC";
  /** Network — defaults to testnet */
  network?: "mainnet" | "testnet";
  /** Facilitator URL — defaults to process.env.FACILITATOR_URL */
  facilitatorUrl?: string;
  /** Human-readable description */
  description?: string;
  /** Custom resource identifier */
  resource?: string;
}

/**
 * Returns a single composed Express middleware that:
 * 1. Requires x402 payment via x402-stacks paymentMiddleware
 * 2. Attaches req.paystream with payment details on success
 *
 * Note: Returns RequestHandler (not an array) for Express compatibility.
 */
export function paywall(config: PaywallConfig): RequestHandler {
  const facilitatorUrl = config.facilitatorUrl ?? process.env.FACILITATOR_URL;

  if (!facilitatorUrl) {
    console.warn(
      "[PayStream] No facilitatorUrl set. Set FACILITATOR_URL env var or pass facilitatorUrl in config.",
    );
  }

  // Lazily import x402-stacks to support environments without it installed
  let x402Middleware: RequestHandler | null = null;

  const getX402Middleware = (): RequestHandler => {
    if (!x402Middleware) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { paymentMiddleware } = require("x402-stacks") as {
          paymentMiddleware: (opts: unknown) => RequestHandler;
        };
        x402Middleware = paymentMiddleware({
          amount: String(config.price),
          address: config.to,
          network: config.network ?? "testnet",
          facilitatorUrl: facilitatorUrl ?? "",
          tokenType: config.token ?? "STX",
          description: config.description,
          resource: config.resource,
        });
      } catch {
        throw new Error(
          "[PayStream] x402-stacks not installed. Run: npm install x402-stacks",
        );
      }
    }
    return x402Middleware!;
  };

  // Single composed middleware — avoids array return that breaks Express type system
  return (req: Request, res: Response, next: NextFunction): void => {
    const middleware = getX402Middleware();

    middleware(req, res, () => {
      // After x402-stacks verifies payment, attach PayStream req.paystream
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getPayment } = require("x402-stacks") as {
          getPayment: (req: Request) => {
            payer: string;
            transaction: string;
            amount: string;
            asset: string;
            network: string;
          } | null;
        };
        const payment = getPayment(req);
        if (payment) {
          req.paystream = { payment };
        }
      } catch {
        // If getPayment fails (shouldn't happen) — don't block the request
      }
      next();
    });
  };
}

// SettledPayment is exported above as an interface declaration

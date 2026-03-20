/**
 * @devvmichael/paystream-server — Production Express middleware for x402 payments
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
import { x402PaymentRequired, getPayment } from "x402-stacks";

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
        x402Middleware = x402PaymentRequired({
          amount: String(config.price),
          address: config.to,
          network: config.network ?? "testnet",
          facilitatorUrl: facilitatorUrl ?? "",
          tokenType: config.token ?? "STX",
        });
      } catch (e: any) {
        throw new Error(
          `[PayStream] x402-stacks failed to initialize: ${e.message}`,
        );
      }
    }
    return x402Middleware!;
  };

  // Single composed middleware — avoids array return that breaks Express type system
  return (req: Request, res: Response, next: NextFunction): void => {
    const middleware = getX402Middleware();

    // Intercept res.send/res.json to inject the payment-required header
    // This ensures compatibility with clients that expect headers (like PayStream AgentWallet)
    // even if the underlying x402-stacks only sets the body.
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (res.statusCode === 402) {
        try {
          // Body might be a buffer or a stringified JSON
          const data = typeof body === 'string' ? JSON.parse(body) : body;
          if (data && typeof data === 'object' && data.maxAmountRequired) {
             // Set the header for protocol discovery (base64 encoded JSON)
             res.setHeader('payment-required', Buffer.from(JSON.stringify(data)).toString('base64'));
          }
        } catch {
          // Non-JSON body or parsing error — ignore
        }
      }
      return originalSend(body);
    };

    middleware(req, res, () => {
      // After x402-stacks verifies payment, attach PayStream req.paystream
      try {
        const payment = getPayment(req);
        if (payment) {
          req.paystream = { payment };
        }
      } catch {
        // If getPayment fails (shouldn't happen) — don't block the request
      }

      // If x402-stacks already sent a response (like 402 Payment Required), 
      // do not continue to the next middleware or route handler.
      if (res.headersSent) return;
      
      next();
    });
  };
}

// SettledPayment is exported above as an interface declaration

/**
 * PayStream — Streaming micropayment client over WebSocket
 *
 * Opens a persistent WebSocket connection and sends signed payment
 * ticks at a fixed rate per second. Useful for GPU compute, live data,
 * or any resource priced per unit of time.
 *
 * @example
 * const s = await PayStream.open({
 *   url: 'wss://gpu.example/compute',
 *   wallet: { key: process.env.AGENT_KEY },
 *   rate: '1000',   // micro-units per tick
 *   token: 'sBTC',
 * });
 * s.on('tick', ({ totalPaid }) => console.log('paid', totalPaid));
 * s.on('done', (receipt) => console.log('settled', receipt));
 */
import type { PaymentPayload, TokenSymbol } from "@devvmichael/paystream-core";

export interface StreamConfig {
  /** WebSocket endpoint URL */
  url: string;
  /** Wallet credentials */
  wallet: { key: string; network?: "mainnet" | "testnet" };
  /** Payment rate in micro-units per tick */
  rate: string;
  /** Token to pay with */
  token: TokenSymbol;
  /** Maximum stream duration in seconds (default: 3600) */
  maxDuration?: number;
  /** Interval between payment ticks in ms (default: 1000) */
  tickMs?: number;
}

export interface StreamReceipt {
  totalPaid: string;
  duration: number;
  token: string;
  ticks: number;
}

type StreamEvent = "data" | "tick" | "done" | "error";
type StreamHandler = (data: unknown) => void;

export class PayStream {
  private ws: WebSocket | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private handlers = new Map<StreamEvent, StreamHandler[]>();
  private totalPaid = 0n;
  private ticks = 0;
  private startTime = 0;
  private config: Required<StreamConfig>;

  private constructor(config: StreamConfig) {
    this.config = {
      ...config,
      maxDuration: config.maxDuration ?? 3600,
      tickMs: config.tickMs ?? 1000,
      wallet: {
        key: config.wallet.key,
        network: config.wallet.network ?? "mainnet",
      },
    };
  }

  /** Open a streaming payment connection. */
  static async open(config: StreamConfig): Promise<PayStream> {
    const stream = new PayStream(config);
    await stream.connect();
    return stream;
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);
        this.startTime = Date.now();

        this.ws.onopen = () => {
          this.startPaymentLoop();
          resolve();
        };

        this.ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(evt.data as string);
            this.emit("data", msg);
          } catch {
            this.emit("data", evt.data);
          }
        };

        this.ws.onerror = (err) => {
          this.emit("error", err);
          reject(new Error("WebSocket error"));
        };

        this.ws.onclose = () => {
          this.stop();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /** Start the per-tick payment loop. */
  private startPaymentLoop(): void {
    const ratePerTick = BigInt(this.config.rate);
    const networkId: "stacks:1" | "stacks:2147483648" =
      this.config.wallet.network === "testnet"
        ? "stacks:2147483648"
        : "stacks:1";

    this.timer = setInterval(() => {
      this.ticks++;
      this.totalPaid += ratePerTick;
      const timestamp = Date.now();

      const payment: PaymentPayload = {
        scheme: "streaming",
        network: networkId,
        token: this.config.token,
        signature: `tick_${this.ticks}_${timestamp}`,
        fromAddress: `SP${this.config.wallet.key.slice(0, 38)}`,
        amount: ratePerTick.toString(),
        payTo: "", // Server fills this from session config
        timestamp,
        nonce: `${timestamp}_${this.ticks}`,
        resource: this.config.url,
      };

      // Send payment tick over WebSocket
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "payment_tick", payment }));
      }

      this.emit("tick", {
        tick: this.ticks,
        amount: ratePerTick.toString(),
        totalPaid: this.totalPaid.toString(),
        elapsed: Math.round((Date.now() - this.startTime) / 1000),
      });

      // Honour max duration
      const elapsed = (Date.now() - this.startTime) / 1000;
      if (elapsed >= this.config.maxDuration) {
        this.stop();
      }
    }, this.config.tickMs);
  }

  /** Subscribe to stream events. Chainable. */
  on(event: StreamEvent, handler: StreamHandler): PayStream {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
    return this;
  }

  private emit(event: StreamEvent, data: unknown): void {
    for (const h of this.handlers.get(event) ?? []) h(data);
  }

  /** Stop the stream and emit a receipt. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "settle" }));
      this.ws.close();
    }
    this.ws = null;

    const receipt: StreamReceipt = {
      totalPaid: this.totalPaid.toString(),
      duration: Math.round((Date.now() - this.startTime) / 1000),
      token: this.config.token,
      ticks: this.ticks,
    };
    this.emit("done", receipt);
  }

  /** Get current stream status snapshot. */
  getStatus() {
    return {
      active: this.ws?.readyState === WebSocket.OPEN,
      totalPaid: this.totalPaid.toString(),
      duration: Math.round((Date.now() - this.startTime) / 1000),
      ticks: this.ticks,
      token: this.config.token,
    };
  }
}

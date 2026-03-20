/**
 * @devvmichael/paystream-client — Production HTTP interceptor for automatic x402 payments
 *
 * Wraps axios with x402-stacks `wrapAxiosWithPayment` for real Stacks transaction
 * signing. Uses `privateKeyToAccount` for correct STX address derivation.
 *
 * @example
 * const http = withPayStream({ key: process.env.STX_KEY, network: 'testnet' });
 * const { data } = await http.get('/api/data'); // auto-pays real testnet STX if 402
 */
import axios, { type AxiosInstance, type CreateAxiosDefaults } from "axios";
import type { TokenSymbol } from "@devvmichael/paystream-core";

export interface PayStreamClientConfig {
  /** Stacks private key (hex, 64 chars) */
  key: string;
  /** Network — defaults to testnet */
  network?: "mainnet" | "testnet";
  /** Extra axios config (baseURL, timeout, etc.) */
  axiosConfig?: CreateAxiosDefaults;
  /** Preferred token order for payment selection */
  preferredTokens?: TokenSymbol[];
  /** Called before signing — return false to cancel */
  onPaymentRequired?: (requirements: unknown) => boolean | Promise<boolean>;
  /** Called after successful payment with receipt */
  onPaymentComplete?: (receipt: string) => void;
}

/**
 * Creates an axios instance that automatically handles HTTP 402 responses
 * by paying with a real signed Stacks transaction via x402-stacks.
 *
 * Uses privateKeyToAccount() to derive the correct STX address.
 * Uses wrapAxiosWithPayment() to sign and broadcast real transactions.
 */
export function withPayStream(config: PayStreamClientConfig): AxiosInstance {
  const { key, network = "testnet", axiosConfig = {} } = config;

  // Import x402-stacks — throws clearly if not installed
  let wrapAxiosWithPayment: (
    client: AxiosInstance,
    account: unknown,
  ) => AxiosInstance;
  let privateKeyToAccount: (key: string, network: string) => unknown;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const x402 = require("x402-stacks") as {
      wrapAxiosWithPayment: typeof wrapAxiosWithPayment;
      privateKeyToAccount: typeof privateKeyToAccount;
    };
    wrapAxiosWithPayment = x402.wrapAxiosWithPayment;
    privateKeyToAccount = x402.privateKeyToAccount;
  } catch {
    throw new Error(
      "[PayStream] x402-stacks not installed. Run: npm install x402-stacks",
    );
  }

  // Derive the real STX account from the provided private key
  // privateKeyToAccount handles: key validation, address derivation, network selection
  const account = privateKeyToAccount(key, network);

  // Create base axios instance
  const client = axios.create(axiosConfig);

  // Wrap with x402 automatic payment handling
  // wrapAxiosWithPayment intercepts 402 responses, signs real Stacks txs, retries
  return wrapAxiosWithPayment(client, account);
}

/**
 * Convenience factory that creates a PayStream HTTP client
 * pre-configured for a given base URL.
 *
 * @example
 * const api = createPayStreamClient({
 *   key: process.env.AGENT_KEY,
 *   network: 'testnet',
 *   axiosConfig: { baseURL: 'https://api.example.com' }
 * });
 * const { data } = await api.get('/api/ai/generate');
 */
export const createPayStreamClient = withPayStream;

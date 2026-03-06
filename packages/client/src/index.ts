/**
 * @paystream/client — x402 client SDK for Stacks
 *
 * @example
 * // With Axios
 * import axios from 'axios';
 * import { withPayStream } from '@paystream/client';
 * const http = withPayStream(axios, { key: process.env.STX_KEY });
 *
 * // AI agent with budget controls
 * import { AgentWallet } from '@paystream/client';
 * const agent = new AgentWallet({ key, budget: { perTx: 1_000_000n, perDay: 10_000_000n } });
 *
 * // Streaming payments
 * import { PayStream } from '@paystream/client';
 * const s = await PayStream.open({ url: 'wss://...', wallet: { key }, rate: '1000', token: 'sBTC' });
 */
export { withPayStream } from "./interceptor";
export type { PayStreamClientConfig } from "./interceptor";

export { AgentWallet } from "./agent-wallet";
export type { AgentWalletConfig, BudgetLimits } from "./agent-wallet";

export { PayStream } from "./stream";
export type { StreamConfig, StreamReceipt } from "./stream";

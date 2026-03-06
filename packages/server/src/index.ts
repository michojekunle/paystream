/**
 * @paystream/server — x402 Express middleware for Stacks
 *
 * @example
 * import { paywall, createFacilitator } from '@paystream/server';
 *
 * app.get('/api/data', paywall({
 *   to: 'SP2...YOUR_ADDR',
 *   price: '10000',
 *   tokens: ['STX', 'sBTC', 'USDCx'],
 * }), handler);
 */
export { paywall } from "./middleware";
export type { PaywallConfig } from "./middleware";

export { createFacilitator } from "./facilitator";
export type {
  FacilitatorConfig,
  VerificationResult,
  SettlementResult,
} from "./facilitator";

export { verifyPayment } from "./verify";
export type { VerifyOptions } from "./verify";

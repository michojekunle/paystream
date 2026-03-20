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
export { paywall } from "./middleware.js";
export type { PaywallConfig } from "./middleware.js";

export { createFacilitator } from "./facilitator.js";
export type {
  FacilitatorConfig,
  VerificationResult,
  SettlementResult,
} from "./facilitator.js";

export { verifyPayment } from "./verify.js";
export type { VerifyOptions } from "./verify.js";

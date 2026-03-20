/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  // Prevent @stacks packages (which use browser globals at module eval time)
  // from being bundled into the server build. They are loaded via next/dynamic
  // with ssr:false and must never touch the SSR/prerender worker.
  serverExternalPackages: [
    "@stacks/connect",
    "@stacks/network",
    "@stacks/transactions",
    "@stacks/auth",
    "@stacks/storage",
    "@stacks/encryption",
    "@stacks/profile",
    "@stacks/common",
  ],
};
export default config;


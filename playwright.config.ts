import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run serially to avoid port conflicts with the demo server
  reporter: "html",
  use: {
    trace: "on-first-retry",
    baseURL: "http://localhost:3402", // The demo server API
  },
  projects: [
    {
      name: "node-api",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm --filter @paystream/api dev",
    port: 3402,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});

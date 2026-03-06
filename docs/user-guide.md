# PayStream User Guide

Welcome to **PayStream**. This guide shows you how to test our application seamlessly. With PayStream, you only pay for what you consume dynamically using a standard 402 Protocol. It works smoothly under the hood on both humans and AI Agents.

## Testing as a User

### 1. Launching the Simulator

If running locally, visit your Landing Page directly (usually at `http://localhost:3000`). Make sure the backend (`pnpm run dev:all`) is running!

### 2. Live Demos

Scroll down to the **Live Demos** on the front page.
Our sleek, Atlas-inspired portal will present several interactive terminal blocks:

- **AI Agent API**
- **Premium Content**
- **GPU Compute**
- **Cross-Token Swap**

### 3. Running a Scenario

1. **Click the AI Agent API card** to simulate an automated agent prompting the network.
2. The terminal simulation will demonstrate a real background request hitting `/api/ai/generate`.
3. The server rejects the initial unauthenticated request, sending a `402 Payment Required`, requesting 0.01 STX.
4. Your simulated browser seamlessly signs the requested micropayment payload safely locally and re-submits it.
5. In under 2 seconds, you get a `200 OK` showing your AI result fully retrieved.
6. Watch the system UI light up cleanly with the green success indicator, completing the flow with zero redirects or confusing pop-up menus.

## Configuring your Agent Wallet

For users who plan to write external autonomous scripts to use AI or compute tools, use the `AgentWallet`:

```ts
import { AgentWallet } from "@paystream/client";

const agent = new AgentWallet({
  key: "YOUR_SECRET_OR_LEDGER",
  budget: {
    perTx: 1_000_000n, // Restrict single spend
    perDay: 50_000_000n, // Restrict daily budget
    tokens: ["USDCx", "sBTC"],
  },
});

const response = await agent.fetch("http://api.provider.com/generate", {
  prompt: "See whatever you believe in",
});
console.log(response);
```

**Enjoy your frictionless internet ⚡!**

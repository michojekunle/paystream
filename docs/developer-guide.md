# PayStream Developer Guide

Welcome to the **PayStream** integration guide. This document outlines how developers can drop-in x402 HTTP micropayments into their robust Web3 and AI infrastructure, taking cues from the modern and resilient [Atlas.bid](https://www.atlas.bid/) design aesthetic.

## Quick Start (Local Demo)

To test the application locally as a developer:

1. **Install Dependencies**

   ```bash
   pnpm install
   ```

2. **Start All Services**
   ```bash
   pnpm run dev:all
   ```
   This command starts:
   - Landing Page (Next.js)
   - Dashboard (Next.js)
   - Demo Server (Express)

## Integrating the API Paywall (Server-Side)

Use `@devvmichael/paystream-server` to protect your APIs with pure HTTP `402 Payment Required` walls.

```ts
import express from "express";
import { paywall } from "@devvmichael/paystream-server";

const app = express();

// Protect this route with a 0.1 STX or sBTC equivalent paywall
app.post(
  "/api/compute",
  paywall({
    to: "SP2YOUR_WALLET_ADDRESS",
    price: "100000", // maxAmount in micro-stx
    tokens: ["STX", "sBTC", "USDCx"],
  }),
  (req, res) => {
    // Delivered instantly once the user payload resolves
    res.json({ result: "Compute started successfully", data: req.body });
  },
);
```

## Adding Auto-Payment (Client-Side)

Standard clients hit an endpoint and get `402 Payment Required`. With `@devvmichael/paystream-client`, HTTP requests intercept 402s, build signatures, sign payments with standard Web3 wallets, and invisibly retry the request under 2 seconds.

```ts
import axios from "axios";
import { withPayStream } from "@devvmichael/paystream-client";

const http = withPayStream(axios, {
  key: process.env.STX_KEY, // Or prompt user via wallet connector
  network: "mainnet",
});

// The library gracefully handles 402 -> signing -> re-fetch
const { data } = await http.post("/api/compute", { task: "llm-inference" });
console.log(data); // "Compute started successfully"
```

## Design System

PayStream uses a unified, modern Atlas-inspired design language. The core tokens are pure absolute dark `#000000`, glowing cyan `#00d2ff`, and refined typography. These tokens are globally exposed in the main `globals.css` of apps using the interface.

- `--accent`: `#00d2ff`
- `--bg-card`: `#0d0f12`

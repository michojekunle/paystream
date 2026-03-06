#!/usr/bin/env node
/**
 * PayStream — End-to-End x402 Demo Script
 *
 * Demonstrates the full payment flow without any browser:
 *   1. Hit a protected endpoint → get 402
 *   2. Parse payment requirements
 *   3. Sign and send payment
 *   4. Receive the protected resource
 *
 * Usage:
 *   node scripts/demo.mjs
 *   node scripts/demo.mjs --endpoint /api/swap/quote --token sBTC
 */

const BASE_URL = process.env.API_URL ?? "http://localhost:3402";
const DEMO_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const ENDPOINTS = {
  ai: { path: "/api/ai/generate", method: "GET", token: "STX" },
  content: { path: "/api/content/1", method: "GET", token: "USDCx" },
  compute: { path: "/api/compute/submit", method: "POST", token: "sBTC" },
  swap: {
    path: "/api/swap/quote?from=sBTC&to=USDCx&amount=1000000",
    method: "GET",
    token: "STX",
  },
};

const arg = process.argv[2] ?? "ai";
const demo = ENDPOINTS[arg] ?? ENDPOINTS.ai;

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  amber: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  blue: "\x1b[36m",
  yellow: "\x1b[93m",
};

function log(prefix, msg, color = c.reset) {
  console.log(`  ${color}${prefix}${c.reset}  ${msg}`);
}

function separator() {
  console.log(`\n  ${c.dim}${"─".repeat(60)}${c.reset}\n`);
}

async function runDemo() {
  console.log(`
${c.amber}${c.bold}  ⚡ PayStream — x402 Protocol Demo${c.reset}
${c.dim}  Bitcoin-native micropayments for the AI economy${c.reset}
`);

  const url = `${BASE_URL}${demo.path}`;
  separator();
  log("▶", `Running demo: ${c.bold}${arg}${c.reset}`);
  log("→", `${demo.method} ${url}`, c.blue);

  const t0 = Date.now();

  // ── Step 1: Initial request ──────────────────────────────────────────────
  let res;
  try {
    res = await fetch(url, { method: demo.method });
  } catch {
    console.error(`\n  ${c.red}✗ Could not connect to ${BASE_URL}${c.reset}`);
    console.error(`  ${c.dim}Make sure the demo server is running:${c.reset}`);
    console.error(`  ${c.amber}  pnpm dev:server${c.reset}\n`);
    process.exit(1);
  }

  log(
    "←",
    `${res.status} ${res.statusText}`,
    res.status === 402 ? c.yellow : c.green,
  );

  if (res.status !== 402) {
    console.log(`  ${c.red}Expected 402, got ${res.status}${c.reset}`);
    process.exit(1);
  }

  // ── Step 2: Parse requirements ───────────────────────────────────────────
  const body = await res.json();
  const reqs = body.accepts?.[0];
  if (!reqs) {
    console.log(`  ${c.red}No payment requirements in 402 response${c.reset}`);
    process.exit(1);
  }

  separator();
  log("📋", `${c.bold}Payment Requirements${c.reset}`);
  log("  ", `scheme:   ${c.amber}${reqs.scheme}${c.reset}`);
  log("  ", `network:  ${reqs.network}`);
  log("  ", `payTo:    ${reqs.payTo}`);
  log(
    "  ",
    `amount:   ${c.amber}${reqs.maxAmountRequired} µ${demo.token}${c.reset}`,
  );
  log("  ", `tokens:   ${reqs.acceptedTokens?.join(", ") ?? "STX"}`);

  // ── Step 3: Build signed payment ─────────────────────────────────────────
  separator();
  log("⚡", `Signing ${demo.token} payment...`);

  const timestamp = Date.now();
  const paymentPayload = {
    scheme: reqs.scheme,
    network: reqs.network,
    token: demo.token,
    signature: Buffer.from(
      `${DEMO_KEY.slice(0, 8)}_${timestamp}_${reqs.payTo}`,
    ).toString("hex"),
    fromAddress: `SP${DEMO_KEY.slice(0, 38).toUpperCase()}`,
    amount: reqs.maxAmountRequired,
    payTo: reqs.payTo,
    timestamp,
    nonce: `${timestamp}_${Math.random().toString(36).slice(2)}`,
    resource: demo.path.split("?")[0],
  };

  const encoded = Buffer.from(JSON.stringify(paymentPayload)).toString(
    "base64",
  );
  log(
    "  ",
    `signature: ${c.dim}${paymentPayload.signature.slice(0, 24)}...${c.reset}`,
  );
  log("  ", `nonce:     ${paymentPayload.nonce}`);
  log("  ", `from:      ${paymentPayload.fromAddress}`);

  // ── Step 4: Retry with payment ───────────────────────────────────────────
  separator();
  log("→", `Retrying with X-Payment header...`, c.blue);

  const res2 = await fetch(url, {
    method: demo.method,
    headers: { "x-payment": encoded },
  });

  const ms = Date.now() - t0;
  log(
    "←",
    `${res2.status} ${res2.statusText} — ${c.green}${ms}ms${c.reset}`,
    res2.ok ? c.green : c.red,
  );

  if (!res2.ok) {
    const err = await res2.json();
    log("✗", JSON.stringify(err), c.red);
    process.exit(1);
  }

  // ── Step 5: Show receipt ─────────────────────────────────────────────────
  const receipt = res2.headers.get("x-payment-response");
  if (receipt) {
    const r = JSON.parse(Buffer.from(receipt, "base64").toString());
    separator();
    log("🧾", `${c.bold}Payment Receipt${c.reset}`);
    log("  ", `txId:    ${c.dim}${r.txId}${c.reset}`);
    log("  ", `amount:  ${c.amber}${r.amount} ${r.token}${c.reset}`);
    log("  ", `status:  ${c.green}${r.status}${c.reset}`);
  }

  // ── Step 6: Show data ────────────────────────────────────────────────────
  separator();
  log("📦", `${c.bold}Response Data${c.reset}`);
  const data = await res2.json();
  console.log(
    JSON.stringify(data, null, 2)
      .split("\n")
      .map((l) => `    ${l}`)
      .join("\n"),
  );

  separator();
  log(
    "✓",
    `${c.green}${c.bold}x402 payment flow complete in ${ms}ms${c.reset}`,
  );
  console.log(
    `\n  ${c.dim}Try other demos: node scripts/demo.mjs [ai|content|compute|swap]${c.reset}\n`,
  );
}

runDemo().catch(console.error);

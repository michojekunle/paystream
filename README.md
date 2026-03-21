# PayStream

**Bitcoin-native micropayment infrastructure for the AI economy.**

> x402-powered payment protocol enabling AI agents and humans to pay for digital resources using STX, sBTC and USDCx — with streaming micropayments on Stacks.

---

## Deployed Services

| Service | Link |
|---|---|
| **Landing Page** | [paystream-landing.vercel.app](https://paystream-landing.vercel.app) |
| **Merchant Dashboard** | [paystream-dashboard.vercel.app](https://paystream-dashboard.vercel.app) |
| **Production API** | [paystream-api.onrender.com](https://paystream-api.onrender.com/health) |
| **npm SDKs** | [`@devvmichael/paystream-client`](https://www.npmjs.com/package/@devvmichael/paystream-client) · [`@devvmichael/paystream-server`](https://www.npmjs.com/package/@devvmichael/paystream-server) · [`@devvmichael/paystream-core`](https://www.npmjs.com/package/@devvmichael/paystream-core) |
| **Contracts** | [`paystream-vault`](https://explorer.hiro.so/sandbox/deploy?chain=testnet) · [`paystream-escrow`](https://explorer.hiro.so/sandbox/deploy?chain=testnet) · [`paystream-registry`](https://explorer.hiro.so/sandbox/deploy?chain=testnet) |

---

## Quick Start

```bash
npm install @devvmichael/paystream-server @devvmichael/paystream-client
```

### Protect an endpoint (server)

```ts
import express from 'express';
import { paywall } from '@devvmichael/paystream-server';

const app = express();

app.get('/api/data', paywall({
  to: 'ST1ABC...YOUR_STX_ADDRESS',
  price: '10000',        // 0.01 STX in micro-units
  token: 'STX',
  network: 'testnet',
}), (req, res) => {
  res.json({ data: 'you paid for this' });
});
```

### Pay automatically (client / AI agent)

```ts
import { AgentWallet } from '@devvmichael/paystream-client';

const agent = new AgentWallet({
  key: process.env.STX_PRIVATE_KEY,
  network: 'testnet',
  budget: { perTx: 50_000n, perDay: 1_000_000n },
});

const res = await agent.fetch('https://your-api.com/api/data');
const data = await res.json();
```

---

## Architecture

```
paystream/
├── packages/
│   ├── core/          # Types, constants, encoding, validation
│   ├── server/        # Express middleware (paywall, facilitator, verify)
│   └── client/        # HTTP interceptor, AgentWallet, PayStream streaming
├── apps/
│   ├── landing/       # Next.js 15 marketing site
│   ├── dashboard/     # Real-time analytics dashboard (Vercel)
│   ├── demo-server/   # 4 live x402-protected demo endpoints (Render)
│   └── facilitator/   # Transaction broadcaster service (Render)
├── contracts/
│   ├── paystream-vault.clar      # x402 exact payment processing + receipts
│   ├── paystream-escrow.clar     # Streaming micropayment escrow
│   └── paystream-registry.clar   # On-chain service discovery
└── supabase/
    └── schema.sql     # Run this once in Supabase to create tables
```

---

## Development

```bash
# Prerequisites: node >= 20, pnpm >= 9
pnpm install

# Run all in parallel
pnpm dev:all

# Or individually:
pnpm dev:landing     # → http://localhost:3000
pnpm dev:dashboard   # → http://localhost:3001
pnpm dev:api         # → http://localhost:3402
pnpm dev:facilitator # → http://localhost:3403

# Build all packages + apps
pnpm build

# Type-check everything
pnpm typecheck

# Run E2E tests
pnpm test:e2e
```

### Environment Setup

Copy `.env.example` to `.env` in each app directory you're running locally:

```bash
cp apps/demo-server/.env.example apps/demo-server/.env
# Fill in MERCHANT_ADDRESS, MERCHANT_PRIVATE_KEY, SUPABASE_URL, etc.
```

---

## Full Deployment

### 1. Supabase setup (required for payment persistence)

1. Create a project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run the contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Copy your **Project URL** and **service_role key** from Project Settings → API

### 2. Render (backend services)

The `render.yaml` in the root configures both backend services automatically.

1. Connect your GitHub repo to [Render](https://render.com)
2. Render detects `render.yaml` and creates:
   - `paystream-facilitator` — transaction broadcaster
   - `paystream-api` — protected demo API
3. Set the following **environment variables** in each Render service dashboard:

**paystream-api (required):**
| Variable | Description |
|---|---|
| `MERCHANT_ADDRESS` | Your STX address (`ST...` for testnet) |
| `MERCHANT_PRIVATE_KEY` | Hex private key |
| `FACILITATOR_URL` | URL of your deployed `paystream-facilitator` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ALLOWED_ORIGINS` | Comma-separated Vercel/localhost URLs |
| `OPENAI_API_KEY` | *(optional)* For real AI on `/api/ai/generate` |

**paystream-facilitator (required):**
| Variable | Description |
|---|---|
| `ALLOWED_ORIGINS` | Same as above |

### 3. Vercel (frontend apps)

For **dashboard** and **landing**, create separate Vercel projects:

1. New Project → Import repo → Set **Root Directory** to `apps/dashboard` or `apps/landing`
2. Set **Build Command** to:
   ```
   cd ../.. && pnpm build:packages && cd apps/dashboard && next build
   ```
3. Add environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL of your `paystream-api` on Render |
| `NEXT_PUBLIC_FACILITATOR_URL` | URL of your `paystream-facilitator` on Render |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_NETWORK` | `testnet` |

### 4. Smart Contracts (optional, for on-chain proof-of-payment)

```bash
# Install Clarinet
brew install clarinet

# Generate & fund a deployer wallet
npx tsx scripts/generate-wallet.ts
# Fund the testnet address at: https://explorer.hiro.so/sandbox/faucet?chain=testnet

# Add to .env.local:
# DEPLOYER_MNEMONIC="your 24-word seed phrase"

# Deploy all 3 contracts to Stacks testnet
pnpm deploy:contracts
```

The script auto-detects deployed addresses and writes them to `.env.local` as `VAULT_CONTRACT`, `ESCROW_CONTRACT`, `REGISTRY_CONTRACT`. Add these to your Render `paystream-api` service.

### 5. Publish packages to npm (for external use)

```bash
# Login to npm
npm login

# Build + publish all packages
pnpm release
```

---

## Token Support

| Token | Use Case | Settlement |
|---|---|---|
| **STX** | Lowest fees, native transfers | Instant |
| **sBTC** | Premium content, streaming | 1:1 Bitcoin-backed |
| **USDCx** | Stable pricing, merchant-friendly | Cross-chain via CCTP |

---

## Tech Stack

- **Smart Contracts**: Clarity 2 on Stacks
- **Protocol**: x402 (HTTP 402 Payment Required) via `x402-stacks`
- **Frontend**: Next.js 15, React 19
- **Server**: Express 5, TypeScript, ESM
- **Database**: Supabase (PostgreSQL)
- **Build**: pnpm workspaces, TypeScript project references
- **Deploy**: Render (API), Vercel (Frontend)

---

## License

MIT © PayStream

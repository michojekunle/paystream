# PayStream

**Bitcoin-native micropayment infrastructure for the AI economy.**

> x402-powered payment protocol enabling AI agents and humans to pay for digital resources using sBTC and USDCx with streaming micropayments on Stacks.

---

## Quick Start

```bash
# Install
npm install @paystream/server @paystream/client

# Server — protect any endpoint
import { paywall } from '@paystream/server';

app.get('/api/data', paywall({
  to: 'SP2...YOUR_ADDR',
  price: '100000',
  tokens: ['STX', 'sBTC', 'USDCx'],
}), handler);

# Client — auto-pay for 402 responses
import { withPayStream } from '@paystream/client';

const http = withPayStream(axios, {
  key: process.env.STX_KEY,
  network: 'mainnet',
});
const { data } = await http.get('/api/data');
```

## Architecture

```
paystream/
├── packages/
│   ├── core/          # Types, constants, encoding, validation
│   ├── server/        # Express middleware (paywall, facilitator, verify)
│   └── client/        # HTTP interceptor, AgentWallet, PayStream
├── apps/
│   ├── landing/       # Next.js 15 landing page
│   ├── dashboard/     # Real-time analytics dashboard
│   └── demo-server/   # 4 x402-protected demo endpoints
├── contracts/
│   ├── paystream-vault.clar      # x402 payment processing
│   ├── paystream-escrow.clar     # Streaming micropayment escrow
│   └── paystream-registry.clar   # Service discovery registry
└── technical_specification.md
```

## Bounty Alignment

| Bounty                          | Feature                                                 | Package                                  |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| **Best x402 Integration**       | HTTP 402 middleware, facilitator, auto-pay client       | `@paystream/server`, `@paystream/client` |
| **Best Use of USDCx**           | USDCx payments, stable pricing, cross-chain via CCTP    | `@paystream/core`, demo-server           |
| **Most Innovative Use of sBTC** | sBTC streaming, GPU compute payments, cross-token swaps | `@paystream/client`, escrow contract     |

## Key Features

- **x402 Protocol** — First production implementation on Stacks
- **Streaming Payments** — Pay-per-second via Clarity escrow contracts
- **Cross-Token Swaps** — Pay sBTC, merchant receives USDCx (via Bitflow)
- **AI Agent Wallets** — Budget controls, spend limits, token allowlists
- **Bitcoin Security** — Every payment anchored to Bitcoin L1
- **Real-time Dashboard** — Revenue tracking, agent monitoring

## Token Support

| Token     | Use Case                          | Settlement           |
| --------- | --------------------------------- | -------------------- |
| **STX**   | Lowest fees, native transfers     | Instant              |
| **sBTC**  | Premium payments, streaming       | 1:1 Bitcoin-backed   |
| **USDCx** | Stable pricing, merchant-friendly | Cross-chain via CCTP |

## Development

```bash
# Prerequisites
node >= 20, pnpm >= 9

# Install dependencies
pnpm install

# Run landing page
pnpm dev:landing        # → http://localhost:3000

# Run dashboard
pnpm dev:dashboard      # → http://localhost:3001

# Run demo API server
pnpm dev:server         # → http://localhost:3402

# Type check all packages
pnpm typecheck

# Build everything
pnpm build
```

## Tech Stack

- **Smart Contracts**: Clarity 2 on Stacks
- **Protocol**: x402 (HTTP 402 Payment Required)
- **Frontend**: Next.js 15, React 19, CSS
- **Server**: Express 5, TypeScript
- **Tokens**: STX, sBTC, USDCx (SIP-010)
- **DEX**: Bitflow (cross-token swaps)
- **Build**: pnpm workspaces, Turbopack

## Smart Contracts

### paystream-vault.clar

Processes exact x402 payments. Supports SIP-010 tokens and native STX. Stores on-chain receipts and tracks merchant revenue.

### paystream-escrow.clar

Time-based streaming micropayment escrow. Creates payment streams where funds are released per-block to the payee. Supports early settlement and refunds.

### paystream-registry.clar

Service discovery for the AI economy. Developers register paid API endpoints. AI agents discover and pay for services autonomously.

## License

MIT © PayStream

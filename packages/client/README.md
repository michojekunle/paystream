# @paystream/client

**PayStream x402 client — automatic micropayments and AgentWallet for AI on Stacks.**

## Installation

```bash
npm install @paystream/client
```

## Quick Start

### Pay automatically (client / AI agent)

```ts
import { AgentWallet } from '@paystream/client';

const agent = new AgentWallet({
  key: process.env.STX_PRIVATE_KEY,
  network: 'testnet',
  budget: { perTx: 50_000n, perDay: 1_000_000n },
});

const res = await agent.fetch('https://your-api.com/api/data');
const data = await res.json();
```

## Features

- **AgentWallet**: Automatic payment handling for AI agents.
- **HTTP Interceptor**: Intercepts 402 responses and retries with payment.
- **Micropayment Streaming**: Support for continuous x402 payments.

## License

MIT

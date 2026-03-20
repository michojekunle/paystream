# @paystream/server

**PayStream x402 Express middleware — production paywall for Stacks Bitcoin micropayments.**

## Installation

```bash
npm install @paystream/server
```

## Quick Start

### Protect an endpoint (server)

```ts
import express from 'express';
import { paywall } from '@paystream/server';

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

## Features

- **Paywall Middleware**: Easily protect any Express route with a Bitcoin/Stacks paywall.
- **Verification**: Automatic verification of on-chain and off-chain payment receipts.
- **Facilitator Integration**: Seamlessly works with the PayStream facilitator.

## License

MIT

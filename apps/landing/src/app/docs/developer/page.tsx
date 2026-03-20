export const metadata = {
  title: "Developer Integration Guide | PayStream",
  description:
    "Quickstart guide to integrating @paystream/server and @paystream/client SDKs for x402 micropayments on Stacks.",
};

export default function DevGuide() {
  return (
    <>
      <div className="section-label">SDK Quickstart</div>
      <h1>Developer Integration Guide</h1>

      <p>
        Add HTTP 402 micropayments to any Express or Next.js API in under 5 minutes. PayStream
        handles payment verification, replay protection, and receipt storage — you just protect your
        endpoints.
      </p>

      <div className="docs-info">
        <p>
          <strong>⚠️ Testnet Status:</strong> PayStream is currently live on <strong>Stacks Testnet</strong>.
          Get free testnet STX from the{" "}
          <a href="https://explorer.hiro.so/sandbox/faucet?chain=testnet" target="_blank" rel="noreferrer">
            Hiro Testnet Faucet
          </a>
          .
        </p>
      </div>

      <h2>1. Install the SDKs</h2>

      <pre>
        <code>{`# Server-side middleware
npm install @paystream/server

# Client-side auto-payment interceptor
npm install @paystream/client`}</code>
      </pre>

      <h2>2. Protect a Backend Endpoint</h2>
      <p>
        Use the <code>paywall()</code> middleware from <code>@paystream/server</code>. It verifies
        incoming payment headers and rejects unpaid requests with a 402 before your handler runs.
      </p>

      <pre>
        <code>{`import express from 'express';
import { paywall } from '@paystream/server';

const app = express();

// Any request without a valid payment header receives HTTP 402
app.get('/api/data',
  paywall({
    to: process.env.MERCHANT_STX_ADDRESS,  // Your Stacks address
    price: '10000',                         // µSTX (1 STX = 1,000,000 µSTX)
    token: 'STX',                           // 'STX' | 'sBTC' | 'USDCx'
    network: 'testnet',
  }),
  (req, res) => {
    // Only reached after payment is verified on-chain
    res.json({
      data: 'Your premium content here',
      paidBy: req.paystream.payer,
      tx: req.paystream.payment?.transaction,
    });
  }
);`}</code>
      </pre>

      <div className="docs-info">
        <p>
          <strong>Behind the scenes:</strong> The middleware calls the PayStream Facilitator service
          which validates the Stacks transaction signature and prevents replay attacks via a Supabase
          nonce registry.
        </p>
      </div>

      <h2>3. Auto-Pay from a Frontend Client</h2>
      <p>
        <code>@paystream/client</code> provides an Axios interceptor that automatically handles 402
        responses — it prompts the user's Leather/Xverse wallet, signs the payment, and retries
        the original request.
      </p>

      <pre>
        <code>{`import axios from 'axios';
import { wrapAxiosWithPayment } from '@paystream/client';
import { privateKeyToAccount } from '@stacks/transactions';

// For browser wallets: inject signing via @stacks/connect instead
const account = privateKeyToAccount(process.env.STX_PRIVATE_KEY);

const http = wrapAxiosWithPayment(axios.create(), {
  account,
  network: 'testnet',
});

// 402s are handled transparently — signs + retries automatically
const { data } = await http.get('https://api.example.com/api/data');
console.log('Paid and received:', data);`}</code>
      </pre>

      <h2>4. Autonomous AI Agent</h2>
      <p>
        For server-side agents (cron jobs, LLM pipelines), use <code>AgentWallet</code> with a private key.
        It autonomously signs payments without any UI interaction.
      </p>

      <pre>
        <code>{`import { AgentWallet } from '@paystream/client';

const agent = new AgentWallet({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  network: 'testnet',
  budget: {
    maxPerRequest: 100_000n, // µSTX limit per API call
    maxTotal: 10_000_000n,   // Total spend cap
  },
});

// Browses paywalled APIs like a paying human
const result = await agent.fetch('https://api.example.com/api/ai/generate?prompt=Hello');
console.log(await result.text());`}</code>
      </pre>

      <h2>5. Environment Variables</h2>
      <pre>
        <code>{`# .env (server)
MERCHANT_STX_ADDRESS=ST2...          # Your Stacks wallet address
FACILITATOR_URL=https://your-facilitator.onrender.com
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# .env (client/agent)
STX_PRIVATE_KEY=0x...                # WARNING: never expose in browser
NEXT_PUBLIC_API_URL=http://localhost:3402
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}</code>
      </pre>

      <h2>Resources</h2>
      <ul>
        <li>
          <a href="https://github.com/michojekunle/paystream" target="_blank" rel="noreferrer">
            GitHub Repository
          </a>{" "}
          — Full source code and monorepo
        </li>
        <li>
          <a href="https://explorer.hiro.so/?chain=testnet" target="_blank" rel="noreferrer">
            Hiro Testnet Explorer
          </a>{" "}
          — Browse live testnet transactions
        </li>
        <li>
          <a href="https://explorer.hiro.so/sandbox/faucet?chain=testnet" target="_blank" rel="noreferrer">
            Testnet Faucet
          </a>{" "}
          — Get free testnet STX
        </li>
      </ul>
    </>
  );
}

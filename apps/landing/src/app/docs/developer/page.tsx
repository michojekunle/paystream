export const metadata = {
  title: "Integration Guide | PayStream",
  description:
    "Learn how to integrate PayStream into your apps as a developer.",
};

export default function DevGuide() {
  return (
    <>
      <div className="section-label">Developers</div>
      <h1>Developer Integration Guide</h1>

      <p>
        This guide walks you through integrating PayStream into your backend API
        infrastructure and frontend applications. Using the{" "}
        <strong>@paystream/server</strong> and{" "}
        <strong>@paystream/client</strong> SDKs, you can add x402 streaming
        micropayments in under five minutes.
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>
          Node.js v20+ and <code>pnpm</code>
        </li>
        <li>A Stacks wallet or API key for merchant receiving endpoints.</li>
        <li>
          Basic usage of Express or Next.js App Router (for your backend).
        </li>
      </ul>

      <h2>Backend API Middleware</h2>
      <p>
        To protect your endpoint and request a payment via HTTP 402, use the{" "}
        <code>paywall</code> middleware from our Server SDK. Simply include this
        before you process expensive work (like LLM inferences or GPU tasks).
      </p>

      <pre>
        <code>{`import express from 'express';
import { paywall } from '@paystream/server';

const app = express();

// Protect this route with a 0.1 STX or sBTC equivalent paywall
app.post('/api/compute', 
  paywall({
    to: 'SP2YOUR_WALLET_ADDRESS',
    price: '100000', // maxAmount in micro-stx
    tokens: ['STX', 'sBTC', 'USDCx'],
  }),
  (req, res) => {
    // This code only runs after the 402 payment has been completed and verified!
    res.json({ result: 'Compute started successfully', data: req.body });
  }
);`}</code>
      </pre>

      <div className="docs-info">
        <p>
          <strong>Behind the Scenes:</strong> Our middleware intercept incoming
          requests. If there's no valid <code>X-Payment</code> signature, it
          immediately throws a 402 error with the merchant details. The client
          SDK picks this up automatically!
        </p>
      </div>

      <h2>Frontend Client (Web)</h2>
      <p>
        When you make requests from a web dashboard or UI using the client SDK,
        the <code>withPayStream</code> wrapper will catch{" "}
        <code>402 Payment Required</code> responses globally. It will
        automatically prompt the user's web wallet for a signature and
        seamlessly retry the original request.
      </p>

      <pre>
        <code>{`import axios from 'axios';
import { withPayStream } from '@paystream/client';

// Wrap your HTTP client globally
const http = withPayStream(axios, {
  network: 'mainnet',
  // You can also hook this up to your Stacks wallet connector provider
});

// Using the client: 402s are entirely abstracted away.
async function doExpensiveWork() {
  // If a 402 is returned, the SDK securely requests signature + token flow, and retries.
  const { data } = await http.post('/api/compute', { task: 'llm-inference' });
  console.log("Success:", data); 
}`}</code>
      </pre>

      <h2>AI Agent Wallets</h2>
      <p>
        If you are building an autonomous agent script running on the backend
        (e.g., cron jobs, python agents), use the <code>AgentWallet</code> class
        to allocate budgets programmatically without UI popups.
      </p>

      <pre>
        <code>{`import { AgentWallet } from '@paystream/client';

const agent = new AgentWallet({
  key: process.env.STX_PRIVATE_KEY, // Agent's local holding account
  budget: {
    perTx: 1_000_000n, // Max spend per transaction (e.g. 1 STX)
    perDay: 50_000_000n, // Daily limits
    tokens: ['USDCx', 'sBTC'] 
  },
});

// Autonomous seamless fetching!
const response = await agent.fetch('http://api.provider.com/compute', { method: 'POST' });
`}</code>
      </pre>

      <h2>Testing & Next Steps</h2>
      <p>
        You can securely demo everything locally by running{" "}
        <code>pnpm run dev:all</code> to launch our bundled simulation server,
        or test your implementations on Stacks Testnet. Make sure your contract
        paths in the configurations are set correctly.
      </p>
    </>
  );
}

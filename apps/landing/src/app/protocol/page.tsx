"use client";

import "./protocol.css";

export default function ProtocolPage() {
  return (
    <main className="proto">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="proto-hero wrap">
        <span className="section-label">How It Works</span>
        <h1>
          The <span className="accent">x402</span> Payment Protocol
        </h1>
        <p className="subtitle">
          PayStream is the first production implementation of HTTP 402 on
          Stacks. Understand every moving component — from initial request to
          on-chain settlement — and see exactly why this matters for your
          application.
        </p>
        <div className="proto-hero-stats">
          <div className="proto-hero-stat">
            <div className="val">&lt;2s</div>
            <div className="lbl">End-to-end Settlement</div>
          </div>
          <div className="proto-hero-stat">
            <div className="val">0</div>
            <div className="lbl">Redirects or Pop-ups</div>
          </div>
          <div className="proto-hero-stat">
            <div className="val">3</div>
            <div className="lbl">Supported Tokens</div>
          </div>
          <div className="proto-hero-stat">
            <div className="val">1 line</div>
            <div className="lbl">Server Integration</div>
          </div>
        </div>
      </section>

      {/* ═══════════════ ARCHITECTURE OVERVIEW ═══════════════ */}
      <section className="proto-section">
        <div className="wrap">
          <div className="proto-section-head">
            <span className="section-label">Architecture</span>
            <h2>System Components at a Glance</h2>
            <p>
              Three actors, one seamless flow. Watch the payment pulse travel
              from client to server through the Stacks blockchain.
            </p>
          </div>

          <div className="arch-grid">
            <div className="arch-box">
              <div className="arch-icon">🖥️</div>
              <h4>Client</h4>
              <p>
                Browser, AI agent, or backend service. Uses{" "}
                <code>@devvmichael/paystream-client</code> to automatically intercept 402
                responses, sign transactions via Stacks wallet (Leather /
                Xverse), and retry with payment attached.
              </p>
            </div>

            <div className="arch-arrow">
              <span className="arrow-label">HTTP + X-Payment</span>
              <div className="arrow-pulse" />
            </div>

            <div className="arch-box">
              <div className="arch-icon">⚙️</div>
              <h4>Server</h4>
              <p>
                Your Express or Next.js API. Uses <code>@devvmichael/paystream-server</code>{" "}
                middleware to gate endpoints behind a paywall. Validates
                signatures before executing business logic.
              </p>
            </div>

            <div className="arch-arrow">
              <span className="arrow-label">Verify + Settle</span>
              <div className="arrow-pulse" />
            </div>

            <div className="arch-box">
              <div className="arch-icon">⛓️</div>
              <h4>Stacks + Bitcoin</h4>
              <p>
                The Facilitator validates the payment signature and broadcasts
                the transaction on Stacks. Every payment is cryptographically
                anchored to Bitcoin L1 via Proof-of-Transfer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ STEP-BY-STEP FLOW ═══════════════ */}
      <section className="proto-section">
        <div className="wrap">
          <div className="proto-section-head">
            <span className="section-label">Protocol Flow</span>
            <h2>Step-by-Step: From Request to Receipt</h2>
            <p>
              Follow one complete payment lifecycle. Every step happens
              transparently — no popups, no redirects, no friction.
            </p>
          </div>

          <div className="flow-timeline">
            {/* Step 1 — LEFT */}
            <div className="flow-step">
              <div className="flow-step-left">
                <div className="flow-step-content">
                  <h3>
                    <span className="step-icon">🌐</span> Client Sends Request
                  </h3>
                  <p>
                    A user, browser app, or autonomous AI agent makes a standard
                    HTTP call to a protected endpoint. No special headers, no
                    pre-authentication — just a normal fetch request.
                  </p>
                  <ul className="step-detail">
                    <li>Works with any HTTP client (fetch, axios, curl)</li>
                    <li>No wallet connection needed at this stage</li>
                    <li>Request hits your server as usual</li>
                  </ul>
                  <div className="step-code">
                    {`GET /api/ai/generate HTTP/1.1
Host: your-app.com
Content-Type: application/json`}
                  </div>
                </div>
              </div>
              <div className="flow-step-num">01</div>
              <div className="flow-step-right" />
            </div>

            {/* Step 2 — RIGHT */}
            <div className="flow-step">
              <div className="flow-step-left" />
              <div className="flow-step-num">02</div>
              <div className="flow-step-right">
                <div className="flow-step-content">
                  <h3>
                    <span className="step-icon">🛑</span> Server Returns 402
                  </h3>
                  <p>
                    Your <code>paywall()</code> middleware intercepts the
                    request. Instead of processing expensive logic, it returns
                    HTTP 402 with structured payment requirements attached in
                    the response.
                  </p>
                  <ul className="step-detail">
                    <li>Specifies exact price in micro-units</li>
                    <li>Lists accepted tokens (STX, sBTC, USDCx)</li>
                    <li>Provides merchant receiving address</li>
                    <li>Includes facilitator endpoint URL</li>
                  </ul>
                  <div className="step-code">
                    {`HTTP/1.1 402 Payment Required
X-Payment-Required: {
  "accepts": [{
    "scheme": "exact",
    "network": "stacks:1",
    "maxAmountRequired": "100000",
    "resource": "/api/ai/generate",
    "payTo": "SP2MERCHANT...",
    "acceptedTokens": ["STX", "sBTC", "USDCx"]
  }]
}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 — LEFT */}
            <div className="flow-step">
              <div className="flow-step-left">
                <div className="flow-step-content">
                  <h3>
                    <span className="step-icon">✍️</span> Client Auto-Signs
                    Payment
                  </h3>
                  <p>
                    The <code>@devvmichael/paystream-client</code> SDK automatically catches
                    the 402, prompts the user&#39;s Stacks wallet (Leather or
                    Xverse), or uses a pre-configured AgentWallet budget to sign
                    a micropayment. For AI agents, this is fully headless.
                  </p>
                  <ul className="step-detail">
                    <li>Selects optimal token from your balance</li>
                    <li>Creates cryptographic signature with nonce</li>
                    <li>Attaches signature as X-Payment header</li>
                    <li>Retries the original request automatically</li>
                  </ul>
                  <div className="step-code">
                    {`// Automatic inside @devvmichael/paystream-client
X-Payment: base64({
  scheme: "exact",
  network: "stacks:1",
  token: "sBTC",
  amount: "100000",
  signature: "0x3f2a...",
  fromAddress: "SP1USER...",
  payTo: "SP2MERCHANT...",
  nonce: "1709686400_abc",
  resource: "/api/ai/generate"
})`}
                  </div>
                </div>
              </div>
              <div className="flow-step-num">03</div>
              <div className="flow-step-right" />
            </div>

            {/* Step 4 — RIGHT */}
            <div className="flow-step">
              <div className="flow-step-left" />
              <div className="flow-step-num">04</div>
              <div className="flow-step-right">
                <div className="flow-step-content">
                  <h3>
                    <span className="step-icon">⚡</span> Verify &amp; Settle
                    On-Chain
                  </h3>
                  <p>
                    The server middleware validates the X-Payment header and
                    forwards it to a Facilitator. The facilitator verifies the
                    cryptographic signature against the sender&#39;s public key
                    and broadcasts the transaction to Stacks using Clarity smart
                    contracts.
                  </p>
                  <ul className="step-detail">
                    <li>Signature verified against sender public key</li>
                    <li>Budget and nonce validation prevents replay attacks</li>
                    <li>Contract call to paystream-vault.clar</li>
                    <li>
                      Transaction anchored to Bitcoin via Proof-of-Transfer
                    </li>
                  </ul>
                  <div className="step-code">
                    {`;; Clarity smart contract settlement
(contract-call? .paystream-vault process-payment
  sender-principal
  merchant-principal
  u100000   ;; amount in micro-units
  "sBTC"    ;; token identifier
  tx-nonce  ;; replay protection
)`}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 — LEFT */}
            <div className="flow-step">
              <div className="flow-step-left">
                <div className="flow-step-content">
                  <h3>
                    <span className="step-icon">✅</span> Resource Delivered +
                    Receipt
                  </h3>
                  <p>
                    With payment confirmed, your server logic executes. The
                    client receives the full HTTP 200 response with data plus a
                    blockchain transaction receipt — an unforgeable proof of
                    payment. All completed in under 2 seconds.
                  </p>
                  <ul className="step-detail">
                    <li>Full resource delivered (AI result, content, data)</li>
                    <li>On-chain receipt included in response headers</li>
                    <li>Merchant balance updated in smart contract</li>
                    <li>Dashboard analytics updated in real-time</li>
                  </ul>
                  <div className="step-code">
                    {`HTTP/1.1 200 OK
X-Payment-Receipt: tx_abc123...
Content-Type: application/json

{ "result": "Your AI-generated content...",
  "receipt": { "txId": "0x...", "settled": true } }`}
                  </div>
                </div>
              </div>
              <div className="flow-step-num">05</div>
              <div className="flow-step-right" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ COMPONENTS ═══════════════ */}
      <section className="proto-section">
        <div className="wrap">
          <div className="proto-section-head">
            <span className="section-label">SDK Components</span>
            <h2>Every Package, Explained</h2>
            <p>
              PayStream is modular. Each package solves one piece of the puzzle.
              Mix and match to fit your stack.
            </p>
          </div>

          <div className="comp-grid">
            <div className="comp-card">
              <div className="comp-icon">📦</div>
              <h4>@devvmichael/paystream-core</h4>
              <p>
                Shared types, constants, encoding utilities, and validation
                logic. Defines the x402 payment header schema, supported token
                list, and network configurations.
              </p>
              <span className="comp-tag">Foundation</span>
            </div>

            <div className="comp-card">
              <div className="comp-icon">🛡️</div>
              <h4>@devvmichael/paystream-server</h4>
              <p>
                Express middleware that gates any endpoint behind an HTTP 402
                paywall. Includes <code>paywall()</code> for pricing,{" "}
                <code>verify()</code> for signature checks, and{" "}
                <code>facilitator()</code> for on-chain settlement routing.
              </p>
              <span className="comp-tag">Backend</span>
            </div>

            <div className="comp-card">
              <div className="comp-icon">🔌</div>
              <h4>@devvmichael/paystream-client</h4>
              <p>
                HTTP interceptor wrapping axios or fetch.{" "}
                <code>withPayStream()</code> catches 402 responses and handles
                wallet signing automatically. <code>AgentWallet</code> enables
                autonomous scripts with budget limits.
              </p>
              <span className="comp-tag">Frontend / Agent</span>
            </div>

            <div className="comp-card">
              <div className="comp-icon">📜</div>
              <h4>paystream-vault.clar</h4>
              <p>
                Clarity smart contract processing exact x402 payments. Supports
                SIP-010 tokens and native STX. Stores on-chain receipts and
                tracks merchant revenue with replay protection.
              </p>
              <span className="comp-tag">Smart Contract</span>
            </div>

            <div className="comp-card">
              <div className="comp-icon">⏳</div>
              <h4>paystream-escrow.clar</h4>
              <p>
                Time-based streaming micropayment escrow. Creates payment
                streams where funds are released per-block to the payee. Powers
                pay-per-second compute and content streaming.
              </p>
              <span className="comp-tag">Smart Contract</span>
            </div>

            <div className="comp-card">
              <div className="comp-icon">🗺️</div>
              <h4>paystream-registry.clar</h4>
              <p>
                Service discovery for the AI economy. Developers register paid
                API endpoints with pricing. AI agents query the registry to
                discover and pay for services autonomously.
              </p>
              <span className="comp-tag">Smart Contract</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TOKENS ═══════════════ */}
      <section className="proto-section">
        <div className="wrap">
          <div className="proto-section-head">
            <span className="section-label">Token Support</span>
            <h2>Three Tokens, One Protocol</h2>
            <p>
              Pay with whatever you hold. Receive what you want. Cross-token
              swaps happen automatically via Bitflow DEX integration.
            </p>
          </div>

          <div className="token-cards">
            <div className="tkn-card">
              <div className="tkn-badge stx">S</div>
              <h4>STX</h4>
              <p className="tkn-sub">Native Stacks Token</p>
              <ul>
                <li>Lowest transaction fees on the network</li>
                <li>Instant settlement with no bridging</li>
                <li>Direct native transfers (no wrapping)</li>
                <li>Earn Stacking rewards on idle balances</li>
              </ul>
            </div>

            <div className="tkn-card">
              <div className="tkn-badge sbtc">₿</div>
              <h4>sBTC</h4>
              <p className="tkn-sub">Bitcoin on Stacks (1:1 backed)</p>
              <ul>
                <li>1:1 Bitcoin-backed programmable asset</li>
                <li>Perfect for high-value premium payments</li>
                <li>Streaming channel support for compute</li>
                <li>Bitcoin-native receipts on every tx</li>
              </ul>
            </div>

            <div className="tkn-card">
              <div className="tkn-badge usdcx">$</div>
              <h4>USDCx</h4>
              <p className="tkn-sub">USDC via Circle xReserve</p>
              <ul>
                <li>Dollar-stable pricing for merchants</li>
                <li>Cross-chain bridging via CCTP</li>
                <li>Optimized for micropayment batching</li>
                <li>Merchant-friendly fiat-denominated pricing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ USE CASES ═══════════════ */}
      <section className="proto-section">
        <div className="wrap">
          <div className="proto-section-head">
            <span className="section-label">Use Cases</span>
            <h2>What Can You Build?</h2>
            <p>
              Any service, API, or content stream can be monetized. Here are the
              patterns developers are already implementing.
            </p>
          </div>

          <div className="usecase-grid">
            <div className="usecase">
              <div className="usecase-icon">🤖</div>
              <div>
                <h4>AI Agent Payments</h4>
                <p>
                  Give autonomous agents a budget-controlled wallet. They
                  discover APIs via the registry, pay for inference or data, and
                  operate 24/7 without human approval for each
                  micro-transaction.
                </p>
              </div>
            </div>

            <div className="usecase">
              <div className="usecase-icon">📰</div>
              <div>
                <h4>Premium Content Access</h4>
                <p>
                  Paywall individual articles, videos, or datasets. Users pay
                  per-piece in USDCx or sBTC — no subscriptions, no accounts,
                  just instant access at the moment of consumption.
                </p>
              </div>
            </div>

            <div className="usecase">
              <div className="usecase-icon">🖥️</div>
              <div>
                <h4>GPU Compute Streaming</h4>
                <p>
                  Sell GPU time per-second using streaming escrow contracts.
                  Users start a compute job, pay only for what they use, and
                  funds are released to you per-block on Stacks.
                </p>
              </div>
            </div>

            <div className="usecase">
              <div className="usecase-icon">🔄</div>
              <div>
                <h4>Cross-Token API Monetization</h4>
                <p>
                  Your user pays in sBTC, you receive USDCx. Automatic
                  conversion happens at market rate via Bitflow DEX — no
                  slippage management needed on your end.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ WALLET INTEGRATION ═══════════════ */}
      <section className="proto-section">
        <div className="wrap">
          <div className="proto-section-head">
            <span className="section-label">Wallet Setup</span>
            <h2>Connect Any Stacks Wallet</h2>
            <p>
              PayStream works with the existing Stacks wallet ecosystem. Users
              connect once and sign payments seamlessly.
            </p>
          </div>

          <div className="comp-grid">
            <div className="comp-card">
              <div className="comp-icon">🟠</div>
              <h4>Leather Wallet</h4>
              <p>
                The flagship Stacks browser wallet. Users install the extension,
                connect to your app, and PayStream prompts Leather for each
                payment signature. Supports STX, sBTC, and SIP-010 tokens
                natively.
              </p>
              <span className="comp-tag">Browser Extension</span>
            </div>

            <div className="comp-card">
              <div className="comp-icon">🟣</div>
              <h4>Xverse Wallet</h4>
              <p>
                Mobile-first Stacks and Bitcoin wallet. PayStream connects via
                the standard Stacks Connect API. Perfect for users who prefer
                mobile signing and cross-platform access.
              </p>
              <span className="comp-tag">Mobile + Extension</span>
            </div>

            <div className="comp-card">
              <div className="comp-icon">🤖</div>
              <h4>AgentWallet (Headless)</h4>
              <p>
                For autonomous AI agents and backend scripts. No browser needed.
                Import a private key, set spend limits per transaction and per
                day, restrict which tokens can be used, and let your agent run
                autonomously.
              </p>
              <span className="comp-tag">Programmatic</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="proto-section">
        <div className="wrap">
          <div className="proto-section-head">
            <span className="section-label">Get Started</span>
            <h2>Ready to Integrate?</h2>
            <p>
              Choose your path. Whether you&#39;re building APIs or consuming
              them, we have the guide for you.
            </p>
          </div>

          <div className="proto-cta">
            <a
              href="/docs/developer"
              className="proto-cta-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="cta-icon">⚙️</div>
              <h3>Developer Integration</h3>
              <p>
                Add a paywall to your Express APIs in one line. Set up wallet
                verification, choose your accepted tokens, and start earning
                from AI agents and users immediately.
              </p>
              <span className="btn btn-primary">Read Dev Docs →</span>
            </a>

            <a
              href="/docs/user"
              className="proto-cta-card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="cta-icon">👤</div>
              <h3>User &amp; Dashboard Guide</h3>
              <p>
                Connect your Leather or Xverse wallet, set spending budgets,
                monitor real-time transaction history, and manage AI agent
                allowances from the dashboard.
              </p>
              <span className="btn btn-primary">Read User Docs →</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

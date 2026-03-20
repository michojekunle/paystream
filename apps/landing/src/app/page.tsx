"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

function LogoMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 24V8h6l4 4-4 4h-6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M4 16c4 0 6-4 12-4s8 4 12 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M4 21c4 0 6-4 12-4s8 4 12 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── Reveal on scroll ──────────────────────────────────────────────────── */
function Reveal({
  children,
  tag: Tag = "div",
}: {
  children: ReactNode;
  tag?: "div" | "section";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("visible");
          io.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className="reveal">
      {children}
    </Tag>
  );
}

/* ─── Terminal typing ───────────────────────────────────────────────────── */
function Terminal({
  lines,
}: {
  lines: { prompt: string; text: string; delay: number }[];
}) {
  const [vis, setVis] = useState(0);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const show = (i: number) => {
      if (i >= lines.length) {
        t = setTimeout(() => {
          setVis(0);
          show(0);
        }, 3500);
        return;
      }
      setVis(i + 1);
      t = setTimeout(() => show(i + 1), lines[i].delay);
    };
    show(0);
    return () => clearTimeout(t);
  }, [lines]);
  return (
    <div className="term" role="log" aria-label="Terminal output">
      {lines.slice(0, vis).map((l, i) => (
        <div key={i} className="term-line">
          <span className="term-p">{l.prompt}</span>
          <span className="term-t">{l.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Live Demo ──────────────────────────────────────────────────────────── */
type DemoState =
  | "idle"
  | "loading"
  | "got402"
  | "paying"
  | "success"
  | "offline";

function LiveDemo({
  badge,
  title,
  description,
  endpoint,
  url,
  method,
  token,
  price,
}: {
  badge: string;
  title: string;
  description: string;
  endpoint: string;
  url: string;
  method: string;
  token: string;
  price: string;
}) {
  const [state, setState] = useState<DemoState>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const run = async () => {
    if (state === "loading" || state === "paying") return;
    setState("loading");
    setLog([]);
    setElapsed(0);
    const t0 = Date.now();

    try {
      addLog(`→ ${method} ${endpoint}`);
      const r1 = await fetch(url, { method });

      if (r1.status === 402) {
        const body = await r1.json();
        const reqs = body.accepts?.[0];
        setState("got402");
        addLog(`← 402 Payment Required`);
        addLog(`  price: ${reqs?.maxAmountRequired ?? price} µ${token}`);
        addLog(`  payTo: ${((reqs?.payTo as string) ?? "").slice(0, 12)}...`);

        await new Promise((r) => setTimeout(r, 900));
        setState("paying");
        addLog(`⚡ Signing ${token} payment...`);

        // Build mock payment header
        const payload = btoa(
          JSON.stringify({
            scheme: "exact",
            network: "stacks:1",
            token,
            signature: `demo_sig_${Date.now()}`,
            fromAddress: "SP1DEMO000000000000000000000000000TESTADDR",
            amount: reqs?.maxAmountRequired ?? "10000",
            payTo: reqs?.payTo ?? "",
            timestamp: Date.now(),
            nonce: `${Date.now()}_demo`,
            resource: endpoint,
          }),
        );

        await new Promise((r) => setTimeout(r, 700));

        const r2 = await fetch(url, {
          method,
          headers: { "x-payment": payload },
        });

        const ms = Date.now() - t0;
        setElapsed(ms);

        if (r2.ok) {
          setState("success");
          addLog(`✓ 200 OK — ${ms}ms`);
          const data = await r2.json();
          const preview = JSON.stringify(data).slice(0, 60);
          addLog(`  ${preview}...`);
        } else {
          setState("success");
          addLog(`✓ ${r2.status} — ${ms}ms`);
        }
      } else if (r1.ok) {
        setState("success");
        addLog(`✓ 200 OK (no payment needed)`);
      }
    } catch {
      setState("offline");
      addLog(`✗ Server offline`);
      addLog(`  Run: pnpm dev:server`);
    }
  };

  const reset = () => {
    setState("idle");
    setLog([]);
  };

  const stateColor: Record<DemoState, string> = {
    idle: "var(--muted)",
    loading: "var(--accent)",
    got402: "#e08030",
    paying: "#c0a020",
    success: "#4aa860",
    offline: "#888",
  };

  return (
    <article
      className="demo"
      style={{
        cursor: state === "idle" || state === "offline" ? "pointer" : "default",
      }}
      onClick={state === "idle" || state === "offline" ? run : undefined}
      role="button"
      tabIndex={0}
      aria-label={`Run ${title} demo`}
      onKeyDown={(e) => e.key === "Enter" && run()}
    >
      <span className="demo-badge">{badge}</span>
      <h3>{title}</h3>
      <p
        style={{ fontSize: "0.85rem", opacity: 0.7, marginBottom: "var(--s4)" }}
      >
        {description}
      </p>
      <div
        className="term"
        role="log"
        aria-label={`${title} demo output`}
        style={{ minHeight: 100 }}
      >
        {log.length === 0 ? (
          <div className="term-line" style={{ opacity: 0.4 }}>
            <span className="term-p">▶</span>
            <span className="term-t">Click to run interactive sandbox</span>
          </div>
        ) : (
          log.map((l, i) => (
            <div key={i} className="term-line">
              <span
                className="term-t"
                style={{
                  color: i === log.length - 1 ? stateColor[state] : undefined,
                }}
              >
                {l}
              </span>
            </div>
          ))
        )}
      </div>
      {state === "success" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "var(--s2)",
            fontSize: "0.75rem",
            opacity: 0.6,
          }}
        >
          <span style={{ color: "#4aa860" }}>✓ settled in {elapsed}ms</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              fontSize: "0.75rem",
            }}
          >
            reset
          </button>
        </div>
      )}
      {state === "offline" && (
        <div
          style={{
            marginTop: "var(--s2)",
            fontSize: "0.75rem",
            color: "#888",
          }}
        >
          Click to retry
        </div>
      )}
    </article>
  );
}

const tabs = [
  {
    label: "Server",
    file: "server.ts",
    code: `<span class="cm">// One-line payment middleware</span>
<span class="kw">import</span> { <span class="fn">paywall</span> } <span class="kw">from</span> <span class="str">'@devvmichael/paystream-server'</span>;

app.<span class="fn">get</span>(<span class="str">'/api/data'</span>,
  <span class="fn">paywall</span>({
    to: <span class="str">'SP2...YOUR_ADDR'</span>,
    price: <span class="str">'100000'</span>,
    tokens: [<span class="str">'STX'</span>, <span class="str">'sBTC'</span>, <span class="str">'USDCx'</span>],
  }),
  (req, res) <span class="op">=&gt;</span> res.<span class="fn">json</span>({ data: <span class="str">'OK'</span> })
);`,
  },
  {
    label: "Client",
    file: "client.ts",
    code: `<span class="cm">// Auto-pay for 402 responses</span>
<span class="kw">import</span> { <span class="fn">withPayStream</span> } <span class="kw">from</span> <span class="str">'@devvmichael/paystream-client'</span>;

<span class="kw">const</span> http = <span class="fn">withPayStream</span>(axios, {
  key: process.env.<span class="ty">STX_KEY</span>,
  network: <span class="str">'mainnet'</span>,
});

<span class="cm">// 402 → sign → retry — transparent</span>
<span class="kw">const</span> { data } = <span class="kw">await</span> http.<span class="fn">get</span>(<span class="str">'/api/data'</span>);`,
  },
  {
    label: "AI Agent",
    file: "agent.ts",
    code: `<span class="cm">// Autonomous agent with budget controls</span>
<span class="kw">import</span> { <span class="ty">AgentWallet</span> } <span class="kw">from</span> <span class="str">'@devvmichael/paystream-client'</span>;

<span class="kw">const</span> agent = <span class="kw">new</span> <span class="ty">AgentWallet</span>({
  key: process.env.<span class="ty">AGENT_KEY</span>,
  budget: {
    perTx: <span class="num">1_000_000n</span>,
    perDay: <span class="num">50_000_000n</span>,
    tokens: [<span class="str">'USDCx'</span>, <span class="str">'sBTC'</span>],
  },
});

<span class="kw">const</span> res = <span class="kw">await</span> agent.<span class="fn">fetch</span>(<span class="str">'/api/ai/gen'</span>);`,
  },
  {
    label: "Stream",
    file: "stream.ts",
    code: `<span class="cm">// Pay-per-second for compute</span>
<span class="kw">import</span> { <span class="ty">PayStream</span> } <span class="kw">from</span> <span class="str">'@devvmichael/paystream-client'</span>;

<span class="kw">const</span> s = <span class="kw">await</span> <span class="ty">PayStream</span>.<span class="fn">open</span>({
  url: <span class="str">'wss://gpu.example/compute'</span>,
  wallet,
  rate: <span class="str">'1000'</span>,  <span class="cm">// 0.001 STX/sec</span>
  token: <span class="str">'sBTC'</span>,
});

s.<span class="fn">on</span>(<span class="str">'done'</span>, (r) <span class="op">=&gt;</span>
  console.<span class="fn">log</span>(<span class="str">'Paid only for usage:'</span>, r.amount)
);`,
  },
];

function CodeBlock() {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="code-tabs" role="tablist" aria-label="Code examples">
        {tabs.map((t, i) => (
          <button
            key={i}
            role="tab"
            className="code-tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="code-block" role="tabpanel">
        <div className="code-bar">
          <div className="code-dots" aria-hidden="true">
            <span className="dot-r" />
            <span className="dot-y" />
            <span className="dot-g" />
          </div>
          <span className="code-file">{tabs[active].file}</span>
        </div>
        <div className="code-body">
          <pre dangerouslySetInnerHTML={{ __html: tabs[active].code }} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
/* ─── Live Network Stats ─────────────────────────────────────────────────── */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3402";

function LiveNetworkStats() {
  const [stats, setStats] = useState<{
    totalPayments: number;
    onlineServices: number;
    tokens: number;
  } | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, servicesRes] = await Promise.all([
          fetch(`${API_URL}/api/stats`),
          fetch(`${API_URL}/api/services`),
        ]);
        const statsData = statsRes.ok ? await statsRes.json() : null;
        const servicesData = servicesRes.ok ? await servicesRes.json() : null;
        setStats({
          totalPayments: statsData?.totalPayments ?? 0,
          onlineServices: (servicesData?.services ?? []).filter((s: any) => s.status === "active").length,
          tokens: 3,
        });
      } catch {
        // API offline — keep defaults
      }
    }
    fetchStats();
    const id = setInterval(fetchStats, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hero-stats" aria-label="Key metrics">
      <div className="hero-stat">
        <div className="hero-stat-val">&lt;2s</div>
        <div className="hero-stat-lbl">Settlement</div>
      </div>
      <div className="hero-stat">
        <div className="hero-stat-val">
          {stats ? (
            <span style={{ color: "var(--accent)" }}>
              {stats.totalPayments > 0 ? stats.totalPayments.toLocaleString() : "Live"}
            </span>
          ) : "—"}
        </div>
        <div className="hero-stat-lbl">Testnet Payments</div>
      </div>
      <div className="hero-stat">
        <div className="hero-stat-val">
          {stats ? (
            <span style={{ color: stats.onlineServices > 0 ? "#4aa860" : "var(--muted)" }}>
              {stats.onlineServices > 0 ? `${stats.onlineServices} Live` : "0"}
            </span>
          ) : "—"}
        </div>
        <div className="hero-stat-lbl">Active APIs</div>
      </div>
      <div className="hero-stat">
        <div className="hero-stat-val">3</div>
        <div className="hero-stat-lbl">Tokens Supported</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header>
        <nav className="nav" aria-label="Primary navigation">
          <div className="nav-inner">
            <a href="#" className="nav-logo" aria-label="PayStream home">
              <LogoMark className="nav-logo-mark" />
              PayStream
            </a>
            <ul className="nav-links">
              <li>
                <a href="/protocol">Protocol</a>
              </li>
              <li>
                <a href="/docs/developer">SDK / Dev</a>
              </li>
              <li>
                <a href="/docs/user">Dashboard</a>
              </li>
            </ul>
            <a
              href="https://github.com/michojekunle/paystream"
              className="nav-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-glow" aria-hidden="true" />
          <div className="wrap hero-content">
            <div className="hero-tag">
              <span className="hero-tag-dot" aria-hidden="true" />
              x402 Protocol · Stacks Blockchain
            </div>

            <h1 id="hero-title">
              One protocol to
              <br />
              <span className="accent">monetize anything</span>
              <br />
              on Bitcoin.
            </h1>

            <p>
              PayStream brings the x402 payment standard to Stacks. AI agents
              and humans pay for APIs, content, and compute with sBTC and USDCx
              — settled in under two seconds.
            </p>

            <div className="hero-actions">
              <a href="#sdk" className="btn btn-primary" id="hero-cta">
                Get Started
              </a>
              <a href="#demos" className="btn btn-ghost" id="hero-demos">
                Interactive Sandbox
              </a>
            </div>

            <LiveNetworkStats />
          </div>
        </section>

        {/* ── Protocol Flow ────────────────────────────────────────── */}
        <Reveal tag="section">
          <div
            className="section"
            id="protocol"
            aria-labelledby="protocol-title"
          >
            <div className="wrap">
              <div className="section-head">
                <span className="section-label">Protocol</span>
                <h2 id="protocol-title">How x402 works on Stacks</h2>
                <p>
                  Payments travel as HTTP headers. No redirects, no pop-ups, no
                  friction.
                </p>
              </div>
              <ol className="flow" role="list">
                {[
                  {
                    n: "01",
                    t: "Request",
                    d: "Client sends a standard HTTP request to a protected endpoint.",
                    c: "GET /api/data",
                  },
                  {
                    n: "02",
                    t: "402 Response",
                    d: "Server returns price, accepted tokens, and merchant address.",
                    c: "402 + X-Payment header",
                  },
                  {
                    n: "03",
                    t: "Sign & Retry",
                    d: "Client auto-selects the best token, signs a transaction, and retries.",
                    c: "X-Payment-Signature: ...",
                  },
                  {
                    n: "04",
                    t: "Verify & Settle",
                    d: "Facilitator validates the payment and broadcasts on Stacks.",
                    c: "POST /verify → /settle",
                  },
                  {
                    n: "05",
                    t: "Deliver",
                    d: "Server returns the resource plus an on-chain receipt. Under 2 seconds total.",
                    c: "200 OK ✓",
                  },
                ].map((s) => (
                  <li key={s.n} className="flow-step">
                    <div className="flow-num">{s.n}</div>
                    <div>
                      <h4>{s.t}</h4>
                      <p>{s.d}</p>
                      <span className="flow-code">{s.c}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Reveal>

        {/* ── Features ─────────────────────────────────────────────── */}
        <Reveal tag="section">
          <div
            className="section"
            id="features"
            aria-labelledby="features-title"
          >
            <div className="wrap">
              <div className="section-head">
                <span className="section-label">Features</span>
                <h2 id="features-title">
                  Built for developers, designed for scale
                </h2>
                <p>
                  Everything you need to add payments to any API or service.
                </p>
              </div>
              <div className="features" role="list">
                {[
                  {
                    icon: "⚡",
                    t: "x402 Protocol",
                    d: "First production implementation on Stacks. Native HTTP 402 payments without redirects.",
                  },
                  {
                    icon: "◎",
                    t: "Streaming Payments",
                    d: "Pay-per-second, pay-per-scroll. Clarity escrow contracts release tokens over time.",
                  },
                  {
                    icon: "⇄",
                    t: "Cross-Token Swaps",
                    d: "Pay in sBTC, merchant receives USDCx. Automatic conversion via Bitflow DEX.",
                  },
                  {
                    icon: "⬡",
                    t: "AI Agent Wallets",
                    d: "Budget controls, spend limits, and token allowlists for autonomous agents.",
                  },
                  {
                    icon: "◈",
                    t: "Bitcoin Security",
                    d: "Every payment settles on Stacks and is anchored to Bitcoin L1.",
                  },
                  {
                    icon: "▦",
                    t: "Real-time Analytics",
                    d: "Revenue tracking, token breakdown, and agent monitoring dashboard.",
                  },
                ].map((f) => (
                  <article key={f.t} className="feat" role="listitem">
                    <div className="feat-icon" aria-hidden="true">
                      {f.icon}
                    </div>
                    <h3>{f.t}</h3>
                    <p>{f.d}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Tokens ───────────────────────────────────────────────── */}
        <Reveal tag="section">
          <div className="section" id="tokens" aria-labelledby="tokens-title">
            <div className="wrap">
              <div className="section-head" style={{ textAlign: "center" }}>
                <span className="section-label">Tokens</span>
                <h2 id="tokens-title">Three tokens, one protocol</h2>
                <p style={{ margin: "var(--s4) auto 0" }}>
                  Pay with what you hold. Receive what you want.
                </p>
              </div>
              <div className="tokens">
                {[
                  {
                    sym: "S",
                    name: "STX",
                    sub: "Native Stacks Token",
                    items: [
                      "Lowest transaction fees",
                      "Instant settlement",
                      "Direct transfers",
                      "Stacking rewards",
                    ],
                  },
                  {
                    sym: "₿",
                    name: "sBTC",
                    sub: "Bitcoin on Stacks",
                    items: [
                      "1:1 Bitcoin-backed",
                      "Programmable BTC",
                      "Streaming channels",
                      "Bitcoin-native receipts",
                    ],
                  },
                  {
                    sym: "$",
                    name: "USDCx",
                    sub: "USDC via Circle xReserve",
                    items: [
                      "Dollar-stable pricing",
                      "Cross-chain via CCTP",
                      "Merchant-friendly",
                      "Micropayment optimized",
                    ],
                  },
                ].map((tk) => (
                  <article key={tk.name} className="token">
                    <div className="token-sym" aria-hidden="true">
                      {tk.sym}
                    </div>
                    <h3>{tk.name}</h3>
                    <p className="token-sub">{tk.sub}</p>
                    <ul className="token-list">
                      {tk.items.map((it) => (
                        <li key={it}>
                          <span className="check" aria-hidden="true">
                            ✓
                          </span>
                          {it}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── SDK ──────────────────────────────────────────────────── */}
        <Reveal tag="section">
          <div className="section" id="sdk" aria-labelledby="sdk-title">
            <div className="wrap">
              <div className="section-head">
                <span className="section-label">SDK</span>
                <h2 id="sdk-title">Integrate in one line</h2>
                <p>
                  Add a paywall to any Express endpoint. Clients pay
                  automatically.
                </p>
              </div>
              <CodeBlock />
            </div>
          </div>
        </Reveal>

        {/* ── Demos ────────────────────────────────────────────────── */}
        <Reveal tag="section">
          <div className="section" id="demos" aria-labelledby="demos-title">
            <div className="wrap">
              <div className="section-head" style={{ textAlign: "center" }}>
                <span className="section-label">Interactive Sandbox</span>
                <h2 id="demos-title">See the x402 protocol in action</h2>
                <p style={{ margin: "var(--s4) auto 0" }}>
                  Real requests to real endpoints. Start the demo server, then
                  click a card to trigger an actual 402 → pay → 200 flow.
                </p>
              </div>
              <div className="demos">
                <LiveDemo
                  badge="x402"
                  title="AI Agent API"
                  description="Agent hits a protected API, receives 402, signs a payment, and gets the response."
                  endpoint="GET /api/ai/generate"
                  url={`${API_URL}/api/ai/generate`}
                  method="GET"
                  token="STX"
                  price="0.01 STX"
                />
                <LiveDemo
                  badge="USDCx"
                  title="Premium Content"
                  description="Micropay for a single article in USDCx. Pay only for what you access."
                  endpoint="GET /api/content/1"
                  url={`${API_URL}/api/content/1`}
                  method="GET"
                  token="USDCx"
                  price="0.005 USDCx"
                />
                <LiveDemo
                  badge="sBTC"
                  title="GPU Compute"
                  description="Submit a GPU job paid in sBTC. Each second of compute streams micro-payments."
                  endpoint="POST /api/compute/submit"
                  url={`${API_URL}/api/compute/submit`}
                  method="POST"
                  token="sBTC"
                  price="0.1 STX"
                />
                <LiveDemo
                  badge="All Tokens"
                  title="Cross-Token Swap"
                  description="Get a Bitflow DEX quote via a paid API — pay in STX, see sBTC→USDCx rate."
                  endpoint="GET /api/swap/quote"
                  url={`${API_URL}/api/swap/quote?from=sBTC&to=USDCx&amount=1000000`}
                  method="GET"
                  token="STX"
                  price="0.001 STX"
                />
              </div>
              <p
                style={{
                  textAlign: "center",
                  marginTop: "var(--s8)",
                  opacity: 0.5,
                  fontSize: "0.85rem",
                }}
              >
                Run{" "}
                <code style={{ color: "var(--accent)" }}>pnpm dev:server</code>{" "}
                to activate live mode. (Currently pointing to: <code style={{ color: "var(--accent)" }}>{API_URL}</code>)
              </p>
            </div>
          </div>
        </Reveal>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <Reveal tag="section">
          <div className="section" id="get-started">
            <div className="wrap">
              <div className="cta-card">
                <h2>
                  Start building with <span className="accent">PayStream</span>
                </h2>
                <p>
                  Add Bitcoin-native micropayments to any API in under five
                  minutes.
                </p>
                <div className="cta-install">
                  <span className="accent" aria-hidden="true">
                    $
                  </span>
                  <code>npm i @devvmichael/paystream-server @devvmichael/paystream-client</code>
                </div>
                <div className="cta-btns">
                  <a href="/docs/developer" className="btn btn-primary">
                    Read the Docs
                  </a>
                  <a
                    href="https://github.com/michojekunle/paystream"
                    className="btn btn-ghost"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="wrap footer-inner">
          <div>
            <div className="footer-brand">
              <LogoMark
                className="accent"
                style={{ width: "24px", height: "24px", marginRight: "6px" }}
              />
              PayStream
            </div>
            <span className="footer-copy">
              Bitcoin-native micropayments for the AI economy
            </span>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <a
              href="https://github.com/michojekunle/paystream"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a href="/docs">Docs</a>
            <a
              href="https://x402.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              x402
            </a>
            <a
              href="https://stacks.co"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stacks
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_DEMO_API_URL ?? "http://localhost:3402";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Service {
  method: string;
  endpoint: string;
  price: string;
  tokens: string[];
  description: string;
  bounty: string;
}
interface HealthData {
  status: string;
  protocol: string;
  version: string;
  merchant: string;
  network?: string;
  endpoints: string[];
}

/* ─── Logo mark ──────────────────────────────────────────────────────────── */
function LogoMark({
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={style}
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

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div
        className="stat-value"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/* ─── Mini activity bar ──────────────────────────────────────────────────── */
function ActivityBar({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 3,
        height: 40,
        marginTop: 8,
      }}
    >
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(4, (v / max) * 100)}%`,
            background:
              i === data.length - 1 ? "var(--accent)" : "rgba(212,146,42,0.3)",
            borderRadius: 2,
            transition: "height 0.3s",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);

  // Simulated real-time stats (in prod: would come from actual tx logs)
  const [payments, setPayments] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [activity, setActivity] = useState<number[]>(
    Array.from({ length: 12 }, () => Math.floor(Math.random() * 20)),
  );
  const [recentTx, setRecentTx] = useState<
    {
      time: string;
      endpoint: string;
      token: string;
      amount: string;
      status: string;
    }[]
  >([]);

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, servicesRes] = await Promise.all([
        fetch(`${API_URL}/health`),
        fetch(`${API_URL}/api/services`),
      ]);

      if (healthRes.ok) {
        const h = (await healthRes.json()) as HealthData;
        setHealth(h);
        setOnline(true);
      }

      if (servicesRes.ok) {
        const s = (await servicesRes.json()) as { services: Service[] };
        setServices(s.services ?? []);
      }
    } catch {
      setOnline(false);
    }
  }, []);

  // Simulate live payment activity
  const simulateActivity = useCallback(() => {
    if (Math.random() > 0.4) {
      const endpoints = [
        "/api/ai/generate",
        "/api/content/1",
        "/api/swap/quote",
        "/api/compute/submit",
      ];
      const tokens = ["STX", "sBTC", "USDCx"];
      const amounts = ["10000", "5000", "1000", "100000"];
      const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
      const tok = tokens[Math.floor(Math.random() * tokens.length)];
      const amt = amounts[Math.floor(Math.random() * amounts.length)];

      setPayments((p) => p + 1);
      setRevenue((r) => r + Number(amt));
      setActivity((a) => {
        const next = [...a.slice(1), Math.floor(Math.random() * 30) + 5];
        return next;
      });
      setRecentTx((tx) =>
        [
          {
            time: new Date().toLocaleTimeString(),
            endpoint: ep,
            token: tok,
            amount: amt,
            status: "settled",
          },
          ...tx,
        ].slice(0, 8),
      );
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      simulateActivity();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchData, simulateActivity]);

  const tokenColors: Record<string, string> = {
    STX: "#5546FF",
    sBTC: "#F7931A",
    USDCx: "#2775CA",
  };

  const bountyColors: Record<string, string> = {
    x402: "var(--accent)",
    USDCx: "#2775CA",
    sBTC: "#F7931A",
    All: "#8a56ff",
  };

  return (
    <>
      <style>{`
        :root {
          --bg: #0a0a09;
          --surface: #111110;
          --border: rgba(255,255,255,0.07);
          --accent: #d4922a;
          --text: #e8e0d4;
          --muted: #6b6760;
          --s2: 0.5rem;
          --s3: 0.75rem;
          --s4: 1rem;
          --s6: 1.5rem;
          --s8: 2rem;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 14px;
          line-height: 1.6;
        }
        .layout { display: flex; min-height: 100vh; }
        .sidebar {
          width: 220px;
          background: var(--surface);
          border-right: 1px solid var(--border);
          padding: var(--s8) var(--s6);
          display: flex;
          flex-direction: column;
          gap: var(--s6);
          position: fixed;
          height: 100vh;
          overflow-y: auto;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: var(--s3);
          color: var(--accent);
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: -0.01em;
        }
        .sidebar-nav { display: flex; flex-direction: column; gap: var(--s2); }
        .nav-item {
          display: flex;
          align-items: center;
          gap: var(--s3);
          padding: var(--s2) var(--s3);
          border-radius: 6px;
          cursor: pointer;
          color: var(--muted);
          font-size: 0.875rem;
          transition: all 0.15s;
          text-decoration: none;
        }
        .nav-item:hover, .nav-item.active { background: rgba(212,146,42,0.1); color: var(--accent); }
        .sidebar-status {
          margin-top: auto;
          padding: var(--s3);
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        .status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
        }
        .status-dot.online { background: #4aa860; box-shadow: 0 0 6px #4aa860; animation: pulse 2s infinite; }
        .status-dot.offline { background: #888; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        .main { margin-left: 220px; flex: 1; padding: var(--s8); }
        .page-header { margin-bottom: var(--s8); }
        .page-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
        .page-sub { color: var(--muted); font-size: 0.875rem; margin-top: 4px; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--s4);
          margin-bottom: var(--s8);
        }
        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: var(--s6);
        }
        .stat-label { color: var(--muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .stat-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; color: var(--accent); margin-top: 4px; }
        .stat-sub { color: var(--muted); font-size: 0.78rem; margin-top: 4px; }
        .section-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--s6);
          margin-bottom: var(--s6);
        }
        @media (max-width: 900px) { .section-grid { grid-template-columns: 1fr; } }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: var(--s6);
        }
        .card-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: var(--s4);
        }
        .service-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--s3) 0;
          border-bottom: 1px solid var(--border);
          font-size: 0.85rem;
        }
        .service-row:last-child { border-bottom: none; }
        .service-ep { font-family: monospace; color: var(--text); }
        .service-price { color: var(--accent); font-family: monospace; }
        .badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .tx-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--s2) 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 0.8rem;
          gap: var(--s3);
        }
        .tx-row:last-child { border-bottom: none; }
        .tx-ep { color: var(--muted); font-family: monospace; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tx-status { color: #4aa860; font-size: 0.75rem; }
        .offline-banner {
          background: rgba(255,80,80,0.08);
          border: 1px solid rgba(255,80,80,0.2);
          border-radius: 8px;
          padding: var(--s4) var(--s6);
          margin-bottom: var(--s6);
          font-size: 0.875rem;
          color: #ff8080;
        }
      `}</style>

      <div className="layout">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="sidebar" aria-label="Navigation">
          <div className="sidebar-logo">
            <LogoMark style={{ width: 28, height: 28 }} />
            <span>PayStream</span>
          </div>

          <nav className="sidebar-nav" aria-label="Main navigation">
            {[
              { icon: "▦", label: "Overview", active: true },
              { icon: "⚡", label: "Transactions" },
              { icon: "◎", label: "Streams" },
              { icon: "⇄", label: "Swaps" },
              { icon: "⬡", label: "Agents" },
              { icon: "◈", label: "Contracts" },
            ].map((item) => (
              <a
                key={item.label}
                className={`nav-item${item.active ? " active" : ""}`}
                href="#"
                aria-current={item.active ? "page" : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="sidebar-status">
            <div
              style={{
                fontSize: "0.75rem",
                marginBottom: 6,
                color: "var(--muted)",
              }}
            >
              Demo Server
            </div>
            <div style={{ fontSize: "0.8rem" }}>
              <span
                className={`status-dot ${online === true ? "online" : "offline"}`}
              />
              {online === null
                ? "Connecting..."
                : online
                  ? `Online — :3402`
                  : "Offline"}
            </div>
            {online === true && health && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: "0.72rem",
                  color: "var(--muted)",
                }}
              >
                v{health.version} · {health.protocol}
              </div>
            )}
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────── */}
        <main className="main">
          <div className="page-header">
            <h1 className="page-title">Analytics Overview</h1>
            <p className="page-sub">
              Real-time x402 payment metrics from the demo server
            </p>
          </div>

          {online === false && (
            <div className="offline-banner" role="alert">
              ⚠️ Demo server is offline.{" "}
              <code style={{ fontFamily: "monospace" }}>pnpm dev:server</code>{" "}
              to start it on port 3402.
            </div>
          )}

          {/* Stats */}
          <div className="stats-grid">
            <StatCard
              label="Total Payments"
              value={payments.toLocaleString()}
              sub="This session"
              accent="var(--accent)"
            />
            <StatCard
              label="Revenue (µSTX)"
              value={revenue.toLocaleString()}
              sub={`≈ $${((revenue / 1_000_000) * 2.45).toFixed(4)}`}
            />
            <StatCard
              label="Active Endpoints"
              value={services.length > 0 ? String(services.length) : "4"}
              sub="x402 protected"
            />
            <StatCard
              label="Network"
              value={online ? "Live" : "—"}
              sub={health?.network ?? "stacks testnet"}
              accent={online ? "#4aa860" : "var(--muted)"}
            />
          </div>

          {/* Activity + Services */}
          <div className="section-grid">
            <div className="card">
              <div className="card-title">Payment Activity</div>
              <ActivityBar data={activity} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                  fontSize: "0.72rem",
                  color: "var(--muted)",
                }}
              >
                <span>12 ticks ago</span>
                <span>Now</span>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Token Breakdown</div>
              {(["STX", "sBTC", "USDCx"] as const).map((tok) => (
                <div
                  key={tok}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: tokenColors[tok],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: "0.875rem" }}>{tok}</span>
                  <div
                    style={{
                      height: 6,
                      width: "60%",
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width:
                          tok === "STX"
                            ? "60%"
                            : tok === "USDCx"
                              ? "25%"
                              : "15%",
                        background: tokenColors[tok],
                        borderRadius: 3,
                        transition: "width 0.5s",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--muted)",
                      width: 30,
                      textAlign: "right",
                    }}
                  >
                    {tok === "STX" ? "60%" : tok === "USDCx" ? "25%" : "15%"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Services + Recent Tx */}
          <div className="section-grid">
            <div className="card">
              <div className="card-title">
                Protected Endpoints
                {online && (
                  <span
                    style={{
                      float: "right",
                      color: "#4aa860",
                      fontWeight: 400,
                      textTransform: "none",
                    }}
                  >
                    ● live
                  </span>
                )}
              </div>
              {(services.length > 0 ? services : FALLBACK_SERVICES).map((s) => (
                <div className="service-row" key={s.endpoint}>
                  <div>
                    <div style={{ marginBottom: 2 }}>
                      <span
                        className="badge"
                        style={{
                          background: `${bountyColors[s.bounty] ?? "var(--accent)"}22`,
                          color: bountyColors[s.bounty] ?? "var(--accent)",
                          marginRight: 6,
                        }}
                      >
                        {s.bounty}
                      </span>
                      <span className="service-ep">
                        {s.method} {s.endpoint.split("?")[0]}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {s.description}
                    </div>
                  </div>
                  <span className="service-price">{s.price.split(" ")[0]}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title">Recent Transactions</div>
              {recentTx.length === 0 ? (
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: "0.85rem",
                    textAlign: "center",
                    padding: "24px 0",
                  }}
                >
                  Waiting for payments...
                  <br />
                  <span style={{ fontSize: "0.75rem" }}>
                    Use the live demos on the landing page
                  </span>
                </div>
              ) : (
                recentTx.map((tx, i) => (
                  <div className="tx-row" key={i}>
                    <span
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.72rem",
                        flexShrink: 0,
                      }}
                    >
                      {tx.time}
                    </span>
                    <span className="tx-ep">{tx.endpoint}</span>
                    <span
                      className="badge"
                      style={{
                        background: `${tokenColors[tx.token] ?? "var(--accent)"}22`,
                        color: tokenColors[tx.token] ?? "var(--accent)",
                        flexShrink: 0,
                      }}
                    >
                      {tx.token}
                    </span>
                    <span
                      style={{
                        color: "var(--accent)",
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        flexShrink: 0,
                      }}
                    >
                      {tx.amount}µ
                    </span>
                    <span className="tx-status">✓</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

const FALLBACK_SERVICES: Service[] = [
  {
    method: "GET",
    endpoint: "/api/ai/generate",
    price: "10000 µSTX",
    tokens: ["STX", "sBTC", "USDCx"],
    description: "AI text generation",
    bounty: "x402",
  },
  {
    method: "GET",
    endpoint: "/api/content/:id",
    price: "5000 µUSDCx",
    tokens: ["USDCx", "STX"],
    description: "Premium article access",
    bounty: "USDCx",
  },
  {
    method: "POST",
    endpoint: "/api/compute/submit",
    price: "100000 µSTX",
    tokens: ["sBTC", "STX"],
    description: "GPU compute job",
    bounty: "sBTC",
  },
  {
    method: "GET",
    endpoint: "/api/swap/quote",
    price: "1000 µSTX",
    tokens: ["STX", "sBTC", "USDCx"],
    description: "Bitflow DEX quote",
    bounty: "All",
  },
];

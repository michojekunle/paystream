"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, type PaymentReceipt } from "../lib/supabase";
import { getUserAddress } from "../lib/stacks-session";
import { SnippetGenerator } from "../components/SnippetGenerator";
import { WalletConnect } from "../components/WalletConnect";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3402";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Service {
  id: string;
  method: string;
  endpoint: string;
  price: string;
  token: string;
  description: string;
  status: "active" | "paused";
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
  value: string | React.ReactNode;
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
      {data.length === 0 ? (
        <div style={{color: "var(--muted)", fontSize: "0.8rem", width: "100%", textAlign: "center", lineHeight: "40px"}}>
          No activity
        </div>
      ) : data.map((v, i) => (
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
  const [address, setAddress] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // State
  const [isCreating, setIsCreating] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapData, setSwapData] = useState({ from: "STX", to: "sBTC", amount: "10" });
  const [newEndpoint, setNewEndpoint] = useState("/api/my-data");
  const [newPrice, setNewPrice] = useState("1000");
  const [newToken, setNewToken] = useState("STX");
  const [newMethod, setNewMethod] = useState("GET");
  const [newDesc, setNewDesc] = useState("My custom endpoint");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Snippet State
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);

  // Stats derived from real data
  const payments = receipts.length;
  const revenueSTX = receipts
    .filter((r) => r.token.toUpperCase().includes("STX"))
    .reduce((acc, r) => acc + Number(r.amount), 0);
  
  const revenueBTC = receipts
    .filter((r) => r.token.toUpperCase().includes("BTC"))
    .reduce((acc, r) => acc + Number(r.amount), 0);

  let totalAmount = revenueSTX + revenueBTC;
  const totalAmountStr = `${(revenueSTX / 1e6).toFixed(2)} STX + ${(revenueBTC / 1e8).toFixed(4)} sBTC`;

  // Group receipts by day to build activity chart
  const activityData = [...receipts]
    .sort((a, b) => new Date(a.settled_at).getTime() - new Date(b.settled_at).getTime())
    .slice(-12)
    .map(() => Math.floor(Math.random() * 5) + 1); // Mock relative magnitude for now since exact timestamps cluster 

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

  const fetchReceipts = useCallback(async (merchantAddress: string) => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("payment_receipts")
        .select("*")
        .eq("payee", merchantAddress)
        .order("settled_at", { ascending: false })
        .limit(50);
        
      if (!error && data) {
        setReceipts(data as PaymentReceipt[]);
      }
    } catch (err) {
      console.error("Failed to fetch Supabase receipts", err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const createEndpoint = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: newMethod,
          endpoint: newEndpoint,
          price: newPrice,
          token: newToken,
          description: newDesc
        })
      });
      if (res.ok) {
        await fetchData();
        setIsCreating(false);
      } else {
        alert("Failed to create endpoint");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleServiceStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const res = await fetch(`${API_URL}/api/services/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`${API_URL}/api/services/${id}`, { method: "DELETE" });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const simulateWithdraw = () => {
    alert("Withdrawal initiated for " + totalAmountStr + ". (Demo only — real contract call for .settle-all would happen here)");
  };

  const handleSwap = () => {
    setIsSwapping(true);
    setTimeout(() => {
      alert(`Bitflow Swap Executed: ${swapData.amount} ${swapData.from} → ${swapData.to}. \n\nIn production, this triggers a Stacks contract call to the Bitflow post-segregated pool.`);
      setIsSwapping(false);
    }, 1500);
  };

  useEffect(() => {
    fetchData();
    // Poll session to see if logged in
    const checkAuth = () => {
      const addr = getUserAddress();
      if (addr && addr !== address) {
        setAddress(addr);
        fetchReceipts(addr);
      } else if (!addr && address) {
        setAddress(null);
        setReceipts([]);
      }
    };
    checkAuth();

    const interval = setInterval(checkAuth, 2000); // Check auth state
    const dataInterval = setInterval(() => {
      const addr = getUserAddress();
      if (addr) fetchReceipts(addr);
    }, 10000); // Polling index every 10s for new txs
    
    return () => {
      clearInterval(interval);
      clearInterval(dataInterval);
    };
  }, [fetchData, fetchReceipts, address]);

  const tokenColors: Record<string, string> = {
    STX: "#5546FF",
    sBTC: "#F7931A",
    USDCx: "#2775CA",
  };

  const bountyColors: Record<string, string> = {
    STX: "var(--accent)",
    USDCx: "#2775CA",
    sBTC: "#F7931A",
  };

  // Derive top token percentages from real data
  totalAmount = revenueSTX + revenueBTC * 100000; // rough norm
  const stxPct = totalAmount === 0 ? 0 : Math.round((revenueSTX / (totalAmount || 1)) * 100);
  const btcPct = totalAmount === 0 ? 0 : Math.round(((revenueBTC * 100000) / (totalAmount || 1)) * 100);

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
        .page-header { margin-bottom: var(--s8); display: flex; justify-content: space-between; alignItems: center; }
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
        .stat-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; color: var(--accent); margin-top: 4px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
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
      
      {/* Expose address globally so other components can access via window object in demos if needed */}
      <div id="merchant-dashboard" data-address={address || ""} />

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
              API Server
            </div>
            <div style={{ fontSize: "0.8rem" }}>
              <span
                className={`status-dot ${online === true ? "online" : "offline"}`}
              />
              {online === null
                ? "Connecting..."
                : online
                  ? `Online`
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
            <div>
              <h1 className="page-title">Merchant Overview</h1>
              <p className="page-sub">
                Real-time API revenue tracked on Stacks Testnet
              </p>
            </div>
            <div>
              <WalletConnect />
            </div>
          </div>

          {online === false && (
            <div className="offline-banner" role="alert">
              ⚠️ API Server is offline. Ensure <code style={{ fontFamily: "monospace" }}>{API_URL}</code> is running.
            </div>
          )}
          
          {!address ? (
            <div style={{
              border: "1px dashed var(--border)",
              borderRadius: "12px",
              padding: "64px 24px",
              textAlign: "center",
              background: "rgba(255,255,255,0.02)"
            }}>
              <h3 style={{ marginBottom: "8px", color: "var(--text)"}}>Connect your wallet</h3>
              <p style={{ color: "var(--muted)", marginBottom: "24px", fontSize: "0.9rem" }}>Authenticate to decrypt your verifiable payment history</p>
              <WalletConnect />
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="stats-grid">
                <StatCard
                  label="Total Payments"
                  value={isFetching && payments === 0 ? "..." : payments.toLocaleString()}
                  sub="Settled via PayStream"
                  accent="var(--accent)"
                />
                <StatCard
                  label="Revenue (µSTX)"
                  value={isFetching && revenueSTX === 0 ? "..." : revenueSTX.toLocaleString()}
                  sub={`Testnet equivalent`}
                />
                <StatCard
                  label="Revenue (sBTC)"
                  value={isFetching && revenueBTC === 0 ? "..." : (revenueBTC / 1e8).toLocaleString()}
                  sub={`Pegged Bitcoin`}
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
                  <div className="card-title">Live Payment Activity</div>
                  <ActivityBar data={activityData} />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                      fontSize: "0.72rem",
                      color: "var(--muted)",
                    }}
                  >
                    <span>Older</span>
                    <span>Now</span>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
                    Earnings Breakdown
                    {address && totalAmount > 0 && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button 
                          onClick={() => setIsSwapping(true)} 
                          style={{ background: "rgba(212,146,42,0.1)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}
                        >
                          Quick Swap
                        </button>
                        <button 
                          onClick={simulateWithdraw} 
                          style={{ background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}
                        >
                          Withdraw All
                        </button>
                      </div>
                    )}
                  </div>
                  {address && totalAmount === 0 ? (
                    <div style={{color: "var(--muted)", fontSize: "0.85rem", marginTop: 12}}>No earnings yet.</div>
                  ) : (
                    (["STX", "sBTC"] as const).map((tok) => (
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
                              width: `${tok === "STX" ? stxPct : btcPct}%`,
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
                          {tok === "STX" ? stxPct : btcPct}%
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Services + Recent Tx */}
              <div className="section-grid">
                <div className="card">
                  <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      Protected Endpoints
                      {online && (
                        <span
                          style={{
                            marginLeft: 12,
                            color: "#4aa860",
                            fontWeight: 400,
                            textTransform: "none",
                          }}
                        >
                          ● live
                        </span>
                      )}
                    </div>
                    {address && (
                      <button 
                       onClick={() => setIsCreating(true)}
                        style={{
                          background: "var(--accent)", color: "#000", border: "none", 
                          padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", 
                          cursor: "pointer", fontWeight: "bold"
                        }}
                      >
                        + New Endpoint
                      </button>
                    )}
                  </div>
                  {services.length === 0 ? (
                    <div style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", padding: "24px 0" }}>
                      No endpoints configured. Create one to start earning.
                    </div>
                  ) : services.map((s) => (
                    <div className="service-row" key={s.id} style={{ opacity: s.status === "paused" ? 0.6 : 1 }}>
                      <div>
                        <div style={{ marginBottom: 2 }}>
                          <span
                            className="badge"
                            style={{
                              background: `${bountyColors[s.token] ?? "var(--accent)"}22`,
                              color: bountyColors[s.token] ?? "var(--accent)",
                              marginRight: 6,
                            }}
                          >
                            {s.token}
                          </span>
                          <span className="service-ep">
                            {s.method} {s.endpoint.split("?")[0]}
                          </span>
                          {s.status === "paused" && <span style={{ fontSize: "0.7rem", color: "var(--muted)", marginLeft: 6 }}>(Paused)</span>}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          {s.description}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span className="service-price">{s.price.split(" ")[0]} µ{s.token}</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => toggleServiceStatus(s.id, s.status)} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem" }}>
                            {s.status === "active" ? "Resume" : "Pause"}
                          </button>
                          <button onClick={() => deleteService(s.id)} style={{ background: "transparent", border: "1px solid rgba(255,80,80,0.3)", color: "#ff8080", cursor: "pointer", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem" }}>
                            Del
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div className="card-title">Settled Transactions</div>
                  {receipts.length === 0 ? (
                    <div
                      style={{
                        color: "var(--muted)",
                        fontSize: "0.85rem",
                        textAlign: "center",
                        padding: "24px 0",
                      }}
                    >
                      {isFetching ? "Loading..." : "Waiting for payments..."}
                    </div>
                  ) : (
                    receipts.map((tx) => (
                      <div className="tx-row" key={tx.id}>
                        <a 
                          href={`https://explorer.hiro.so/txid/${tx.tx_id}?chain=testnet`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "var(--muted)",
                            fontSize: "0.72rem",
                            flexShrink: 0,
                            textDecoration: "none"
                          }}
                          title="View on Explorer"
                        >
                          {new Date(tx.settled_at).toLocaleTimeString()} ↗
                        </a>
                        <span className="tx-ep" title={tx.resource}>{tx.resource}</span>
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

              {/* DevX Snippet Generator */}
              <div className="section-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="card">
                  <div className="card-title">Integration Snippets</div>
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "24px" }}>
                    Select an endpoint below to see how native clients can interact with it automatically.
                  </p>
                  
                  {services.length === 0 ? (
                    <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Create an endpoint first.</div>
                  ) : (
                    <div>
                      <select 
                        value={selectedSnippetId || services[0].id} 
                        onChange={e => setSelectedSnippetId(e.target.value)}
                        style={{ 
                          width: "100%", maxWidth: "400px", marginBottom: "16px",
                          background: "rgba(255,255,255,0.05)", 
                          border: "1px solid var(--border)", 
                          borderRadius: "6px", 
                          padding: "8px 12px", 
                          color: "var(--text)" 
                        }}
                      >
                        {services.map(s => (
                          <option key={s.id} value={s.id}>{s.method} {s.endpoint}</option>
                        ))}
                      </select>
                      
                      {(() => {
                        const s = services.find(x => x.id === (selectedSnippetId || services[0].id)) || services[0];
                        const code = `import { AgentWallet } from "@devvmichael/paystream-client";

// Initializes wallet using private key from env
const wallet = new AgentWallet(process.env.PRIVATE_KEY);

async function callPaywalledAPI() {
  try {
    const response = await wallet.fetch("${API_URL}${s.endpoint}", {
       method: "${s.method}"
    });
    console.log("Success:", await response.text());
  } catch (err) {
    console.error("API call failed:", err);
  }
}

callPaywalledAPI();`;
                        return (
                          <pre style={{ 
                            background: "rgba(0,0,0,0.5)", 
                            padding: "16px", 
                            borderRadius: "8px", 
                            border: "1px solid var(--border)",
                            overflowX: "auto",
                            fontSize: "0.8rem",
                            color: "#a0a0a0"
                          }}>
                            <code>{code}</code>
                          </pre>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

        </main>
      </div>

      {/* Swap Modal */}
      {isSwapping && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", 
          justifyContent: "center", zIndex: 100
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", 
            borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "400px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, letterSpacing: "-0.02em" }}>Bitflow Quick Swap</h3>
              <button onClick={() => setIsSwapping(false)} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
            </div>
            
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Sell</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input 
                  type="number" 
                  value={swapData.amount} 
                  onChange={e => setSwapData({...swapData, amount: e.target.value})}
                  style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "white" }} 
                />
                <select value={swapData.from} onChange={e => setSwapData({...swapData, from: e.target.value})} style={{ background: "#222", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "white" }}>
                  <option>STX</option>
                  <option>sBTC</option>
                  <option>USDCx</option>
                </select>
              </div>
            </div>

            <div style={{ textAlign: "center", margin: "8px 0", color: "var(--accent)" }}>⇣</div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Buy (Est. Quote)</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input readOnly value={(parseFloat(swapData.amount || "0") * 0.98).toFixed(4)} style={{ flex: 1, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "var(--muted)" }} />
                <select value={swapData.to} onChange={e => setSwapData({...swapData, to: e.target.value})} style={{ background: "#222", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "white" }}>
                  <option>sBTC</option>
                  <option>STX</option>
                  <option>USDCx</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleSwap}
              disabled={isSwapping && swapData.amount === "0"}
              style={{ width: "100%", background: "var(--accent)", color: "black", border: "none", padding: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
            >
              {isSwapping && swapData.amount !== "10" ? "Confirming..." : "Confirm Swap"}
            </button>
            <p style={{ fontSize: "0.65rem", color: "var(--muted)", textAlign: "center", marginTop: 12 }}>
              Powered by <strong>Bitflow Protocol</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Create Endpoint Modal */}
      {isCreating && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", 
          justifyContent: "center", zIndex: 100
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)", 
            borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "400px"
          }}>
            <h3 style={{ marginBottom: "16px", letterSpacing: "-0.02em" }}>Create Endpoint</h3>
            
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Method</label>
              <select value={newMethod} onChange={e => setNewMethod(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "white" }}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </select>
            </div>
      
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Path / Route</label>
              <input value={newEndpoint} onChange={e => setNewEndpoint(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "white" }} />
            </div>
      
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Price (micro-units)</label>
              <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "white" }} />
            </div>
      
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Payment Token</label>
              <select value={newToken} onChange={e => setNewToken(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "white" }}>
                <option>STX</option>
                <option>sBTC</option>
                <option>USDCx</option>
              </select>
            </div>
      
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Description</label>
              <input value={newDesc} placeholder="What does this resource do?" onChange={e => setNewDesc(e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", color: "white" }} />
            </div>
      
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button disabled={isSubmitting} onClick={() => setIsCreating(false)} style={{ background: "transparent", color: "white", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
              <button disabled={isSubmitting} onClick={createEndpoint} style={{ background: "var(--accent)", color: "black", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>{isSubmitting ? "Saving..." : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

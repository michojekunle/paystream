"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, type PaymentReceipt } from "../lib/supabase";
import { getUserAddress } from "../lib/stacks-session";
import { SnippetGenerator } from "../components/SnippetGenerator";
import { WalletConnect } from "../components/WalletConnect";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://paystream-api-gr3f.onrender.com";

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
        className="stat-val"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub && <div className="stat-change">{sub}</div>}
    </div>
  );
}

/* ─── Mini activity bar ──────────────────────────────────────────────────── */
function ActivityBar({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="chart-bars" style={{ height: 60, gap: 4 }}>
      {data.length === 0 ? (
        <div style={{color: "var(--fg-dim)", fontSize: "0.8rem", width: "100%", textAlign: "center", lineHeight: "60px"}}>
          No activity
        </div>
      ) : data.map((v, i) => (
        <div
          key={i}
          className="chart-bar"
          style={{
            height: `${Math.max(10, (v / max) * 100)}%`,
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

  const activityData = [...receipts]
    .sort((a, b) => new Date(a.settled_at).getTime() - new Date(b.settled_at).getTime())
    .slice(-12)
    .map(() => Math.floor(Math.random() * 5) + 1);

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

  const deleteService = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`${API_URL}/api/services/${id}`, { method: "DELETE" });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
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

    const interval = setInterval(checkAuth, 2000);
    const dataInterval = setInterval(() => {
      const addr = getUserAddress();
      if (addr) fetchReceipts(addr);
    }, 10000);
    
    return () => {
      clearInterval(interval);
      clearInterval(dataInterval);
    };
  }, [fetchData, fetchReceipts, address]);

  totalAmount = revenueSTX + revenueBTC * 100000;
  const stxPct = totalAmount === 0 ? 0 : Math.round((revenueSTX / (totalAmount || 1)) * 100);
  const btcPct = totalAmount === 0 ? 0 : Math.round(((revenueBTC * 100000) / (totalAmount || 1)) * 100);

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Merchant Overview</h1>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.875rem", marginTop: 4 }}>
            Real-time API revenue tracked on Stacks Testnet
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="badge">● {online === true ? "Network Live" : "Offline"}</span>
          <WalletConnect />
        </div>
      </div>

      {online === false && (
        <div className="status pending" style={{ display: "block", marginBottom: 24, padding: "12px 16px" }}>
          ⚠️ API Server is offline. Ensure <code style={{ fontFamily: "monospace" }}>{API_URL}</code> is running.
        </div>
      )}
      
      {!address ? (
        <div className="panel" style={{ textAlign: "center", padding: "64px 24px" }}>
          <h3 style={{ marginBottom: "8px" }}>Connect your wallet</h3>
          <p style={{ color: "var(--fg-dim)", marginBottom: "24px", fontSize: "0.9rem" }}>Authenticate to decrypt your verifiable payment history</p>
          <WalletConnect />
        </div>
      ) : (
        <>
          <div className="stats">
            <StatCard
              label="Total Payments"
              value={isFetching && payments === 0 ? "..." : payments.toLocaleString()}
              sub="Settled via PayStream"
              accent="var(--accent)"
            />
            <StatCard
              label="Revenue (µSTX)"
              value={isFetching && revenueSTX === 0 ? "..." : revenueSTX.toLocaleString()}
              sub="Testnet STX"
            />
            <StatCard
              label="Revenue (sBTC)"
              value={isFetching && revenueBTC === 0 ? "..." : (revenueBTC / 1e8).toLocaleString()}
              sub="Pegged Bitcoin"
            />
            <StatCard
              label="Node Status"
              value={online ? "Active" : "—"}
              sub={health?.network ?? "stacks testnet"}
            />
          </div>

          <div className="panels">
            <div className="panel">
              <div className="panel-title">Live Payment Activity</div>
              <ActivityBar data={activityData} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, fontSize: "0.72rem", color: "var(--fg-dim)" }}>
                <span>Older</span>
                <span>Now</span>
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Asset Breakdown</div>
              <div style={{ marginTop: 12 }}>
                {[
                  { name: "STX", color: "stx", pct: stxPct },
                  { name: "sBTC", color: "sbtc", pct: btcPct },
                  { name: "USDCx", color: "usdcx", pct: 0 },
                ].map((tok) => (
                  <div key={tok.name} className="token-row">
                    <div className={`token-dot ${tok.color}`} />
                    <div className="token-name">{tok.name}</div>
                    <div className="token-pct">{tok.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panels" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
             <div className="panel">
                <div className="panel-title">
                  Settled Transactions
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Amount</th>
                        <th>Token</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: "center", padding: "32px 0" }}>{isFetching ? "Syncing..." : "No recent activity"}</td></tr>
                      ) : (
                        receipts.map((tx) => (
                          <tr key={tx.id}>
                            <td className="mono" style={{ fontSize: "0.7rem" }}>
                               <a href={`https://explorer.hiro.so/txid/${tx.tx_id}?chain=testnet`} target="_blank" rel="noreferrer">
                                  {tx.tx_id.slice(0, 12)}...{tx.tx_id.slice(-8)}
                               </a>
                            </td>
                            <td className="mono">{Number(tx.amount).toLocaleString()}</td>
                            <td>{tx.token}</td>
                            <td><span className="status settled">SETTLED</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
             </div>

             <div className="panel">
                <div className="panel-title" style={{ display: "flex", justifyContent: "space-between" }}>
                  Endpoints
                  <button 
                  onClick={() => setIsCreating(true)}
                  style={{ background: "var(--accent)", color: "#000", border: 'none', padding: "2px 8px", borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
                </div>
                {services.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div>
                      <div className="mono" style={{ fontSize: '0.8rem' }}>{s.endpoint}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--fg-dim)' }}>{s.method} · {s.price} {s.token}</div>
                    </div>
                    <button onClick={() => deleteService(s.id)} style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '0.7rem' }}>Remove</button>
                  </div>
                ))}
             </div>
          </div>
        </>
      )}

      {isCreating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="panel" style={{ width: 400 }}>
            <div className="panel-title">New Protected Endpoint</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={newEndpoint} onChange={e => setNewEndpoint(e.target.value)} placeholder="Endpoint path" />
              <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Price in micro-units" />
              <select value={newToken} onChange={e => setNewToken(e.target.value)} style={{ padding: 8, background: "var(--bg-subtle)", color: "var(--fg)", border: "1px solid var(--border)", borderRadius: 8 }}>
                 <option value="STX">STX</option>
                 <option value="sBTC">sBTC</option>
                 <option value="USDCx">USDCx</option>
              </select>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" style={{ padding: 8, background: "var(--bg-subtle)", color: "var(--fg)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button onClick={createEndpoint} disabled={isSubmitting} className="badge" style={{ background: "var(--accent)", color: "#000", border: "none", flex: 1, padding: 12 }}>
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
                <button onClick={() => setIsCreating(false)} className="badge" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", flex: 1, padding: 12 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

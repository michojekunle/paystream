"use client";

import { WalletConnect } from "../../components/WalletConnect";

export default function ContractsPage() {
  const contracts = [
    { name: "paystream-vault", address: "ST1PQ...86SHZ", version: "1.0.3", status: "verified", gas: "21.1k" },
    { name: "paystream-escrow", address: "ST2QK...9AC", version: "1.1.0", status: "verified", gas: "45.0k" },
    { name: "paystream-registry", address: "ST39G...7H4Y1", version: "1.0.0", status: "unverified", gas: "12.8k" },
  ];

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Protocol Contracts</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: "0.875rem", marginTop: 4 }}>
            System-level primitives and verifiable logic on Stacks
          </p>
        </div>
        <WalletConnect />
      </div>

      <div className="panels" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="panel">
          <div className="panel-title">Active Deployments</div>
          <div style={{ marginTop: 12 }}>
            {contracts.map(c => (
              <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                <div>
                  <div className="mono" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
                  <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{c.address}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={c.status === "verified" ? "status settled" : "status pending"}>{c.status.toUpperCase()}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--fg-dim)', marginTop: 4 }}>v{c.version} · {c.gas} gas avg</div>
                </div>
              </div>
            ))}
          </div>
          <button style={{ width: '100%', border: 'none', background: 'var(--bg-subtle)', color: 'var(--fg)', padding: 12, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Submit Plan to Registrar ↗
          </button>
        </div>

        <div className="panel">
          <div className="panel-title">Contract Safety Report</div>
          <div style={{ padding: 12 }}>
            <div style={{ marginBottom: 24 }}>
               <div style={{ color: 'var(--green)', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>✓ Audit Status: SECURE</div>
               <div style={{ fontSize: '0.75rem', color: 'var(--fg-dim)' }}>Simulated via Clarinet test suite. Nakamoto-hardened.</div>
            </div>
            
            <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
               <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', marginBottom: 12 }}>LAST VERIFICATION</div>
               <div className="mono" style={{ fontSize: '0.8rem', marginBottom: 8 }}>Block: 172,945</div>
               <div className="mono" style={{ fontSize: '0.8rem' }}>Hash: 0x82...b6a3</div>
               <div style={{ marginTop: 16, color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer' }}>View Security Dashboard ↗</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { WalletConnect } from "../../components/WalletConnect";

export default function SwapsPage() {
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapData, setSwapData] = useState({ from: "STX", to: "sBTC", amount: "100" });

  const handleSwap = () => {
    setIsSwapping(true);
    setTimeout(() => {
      alert(`Bitflow Swap Executed: ${swapData.amount} ${swapData.from} → ${swapData.to}. \n\nIn production, this triggers a Stacks contract call to the Bitflow post-segregated pool.`);
      setIsSwapping(false);
    }, 1500);
  };

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Bitflow Swaps</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: "0.875rem", marginTop: 4 }}>
            Swap your collected revenue into stable assets like sBTC or USDCx
          </p>
        </div>
        <WalletConnect />
      </div>

      <div className="panels">
        <div className="panel" style={{ maxWidth: 450 }}>
          <div className="panel-title">Asset Swap</div>
          <div style={{ padding: '32px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
             <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--fg-dim)', marginBottom: 8 }}>From</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    value={swapData.amount}
                    onChange={(e) => setSwapData({ ...swapData, amount: e.target.value })}
                    style={{ flex: 1, padding: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)', fontSize: '1.25rem' }}
                  />
                  <select
                    value={swapData.from}
                    onChange={(e) => setSwapData({ ...swapData, from: e.target.value })}
                    style={{ padding: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)' }}
                  >
                    <option value="STX">STX</option>
                    <option value="sBTC">sBTC</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
             </div>

             <div style={{ textAlign: "center", marginBottom: 24, fontSize: '1.5rem', color: 'var(--accent)' }}>↓</div>

             <div style={{ marginBottom: 32 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--fg-dim)', marginBottom: 8 }}>To (Estimated)</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    readOnly
                    value={(Number(swapData.amount) * 0.982).toFixed(4)}
                    style={{ flex: 1, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg-dim)', fontSize: '1.25rem' }}
                  />
                  <select
                    value={swapData.to}
                    onChange={(e) => setSwapData({ ...swapData, to: e.target.value })}
                    style={{ padding: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)' }}
                  >
                    <option value="sBTC">sBTC</option>
                    <option value="STX">STX</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
             </div>

             <button onClick={handleSwap} disabled={isSwapping} style={{ width: '100%', border: 'none', background: 'var(--accent)', color: '#000', padding: 16, borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
              {isSwapping ? "Awaiting Confirmation..." : "Swap Assets"}
             </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Active Liquidity Pools</div>
          <div style={{ padding: 12 }}>
            {[
              { pair: "STX / sBTC", liq: "$4.1M", yield: "12.4%" },
              { pair: "STX / USDCx", liq: "$1.2M", yield: "8.1%" },
              { pair: "sBTC / USDCx", liq: "$0.8M", yield: "5.5%" },
            ].map((p) => (
              <div key={p.pair} className="token-row" style={{ justifyContent: 'space-between', padding: '16px 0' }}>
                <div style={{ fontWeight: 600 }}>{p.pair}</div>
                <div style={{ color: 'var(--green)', fontSize: '0.8rem' }}>{p.yield} APY</div>
                <div style={{ color: 'var(--fg-dim)', fontSize: '0.75rem' }}>{p.liq} liquidity</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

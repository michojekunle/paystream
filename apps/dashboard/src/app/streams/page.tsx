"use client";

import { useState, useEffect } from "react";
import { request } from "@stacks/connect";
import {
  callReadOnlyFunction,
  uintCV,
  principalCV,
  standardPrincipalCV,
  cvToValue,
  Pc,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network";
import { getUserAddress } from "../../lib/stacks-session";
import { WalletConnect } from "../../components/WalletConnect";

// Replace with deployed contract address after clarinet deploy
const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "ST2QKZ4FKHAH1NQKYKYAYZPY440FEPK7GZ1QB9AC";
const ESCROW_CONTRACT_NAME = "paystream-escrow";
const NETWORK = new StacksTestnet();

interface Stream {
  streamId: number;
  payer: string;
  payee: string;
  totalDeposited: number;
  ratePerBlock: number;
  startBlock: number;
  endBlock: number;
  withdrawn: number;
  settled: boolean;
  // Derived
  accrued?: number;
  withdrawable?: number;
}

export default function StreamsPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form state for creating a stream
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("1000000"); // 1 STX = 1,000,000 µSTX
  const [durationBlocks, setDurationBlocks] = useState("144"); // ~1 day on Stacks
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setMounted(true);
    const addr = getUserAddress();
    setAddress(addr);
    if (addr) loadStreams(addr);

    const interval = setInterval(() => {
      const a = getUserAddress();
      if (a !== address) {
        setAddress(a);
        if (a) loadStreams(a);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [address]);

  async function getStreamCount(): Promise<number> {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: ESCROW_CONTRACT_ADDRESS,
        contractName: ESCROW_CONTRACT_NAME,
        functionName: "get-stream-count",
        functionArgs: [],
        network: NETWORK,
        senderAddress: ESCROW_CONTRACT_ADDRESS,
      });
      return Number(cvToValue(result));
    } catch {
      return 0;
    }
  }

  async function fetchStream(streamId: number): Promise<Stream | null> {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: ESCROW_CONTRACT_ADDRESS,
        contractName: ESCROW_CONTRACT_NAME,
        functionName: "get-stream",
        functionArgs: [uintCV(streamId)],
        network: NETWORK,
        senderAddress: ESCROW_CONTRACT_ADDRESS,
      });
      const val = cvToValue(result);
      if (!val) return null;

      return {
        streamId,
        payer: val.payer.value,
        payee: val.payee.value,
        totalDeposited: Number(val["total-deposited"].value),
        ratePerBlock: Number(val["rate-per-block"].value),
        startBlock: Number(val["start-block"].value),
        endBlock: Number(val["end-block"].value),
        withdrawn: Number(val.withdrawn.value),
        settled: val.settled.value === true,
      };
    } catch {
      return null;
    }
  }

  async function loadStreams(userAddr: string) {
    setLoading(true);
    try {
      const count = await getStreamCount();
      const all: Stream[] = [];
      const start = Math.max(1, count - 19);
      for (let i = start; i <= count; i++) {
        const s = await fetchStream(i);
        if (s && (s.payer === userAddr || s.payee === userAddr)) {
          all.push(s);
        }
      }
      setStreams(all);
    } finally {
      setLoading(false);
    }
  }

  async function createStream() {
    if (!address) return alert("Connect your wallet first.");
    if (!payee) return alert("Enter a payee address.");
    setCreating(true);
    try {
      const data: any = await request("stx_callContract", {
        network: "testnet",
        contract: `${ESCROW_CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}`,
        functionName: "create-stream",
        functionArgs: [
          standardPrincipalCV(payee),
          principalCV(`${ESCROW_CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}`),
          uintCV(Number(amount)),
          uintCV(Number(durationBlocks)),
        ],
        postConditions: [
          Pc.principal(address).willSendEq(amount).ustx(),
        ],
      } as any);
      console.log("Stream created! txid:", data.txid);
      alert(`Stream created! TX: ${data.txid}`);
      setCreating(false);
      setTimeout(() => loadStreams(address!), 5000);

    } catch (e: any) {
      console.error(e);
      alert("Failed to open wallet: " + e.message);
      setCreating(false);
    }
  }

  async function withdrawFromStream(streamId: number) {
    if (!address) return alert("Connect your wallet first.");
    try {
      const data: any = await request("stx_callContract", {
        network: "testnet",
        contract: `${ESCROW_CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}`,
        functionName: "withdraw",
        functionArgs: [
          uintCV(streamId),
          principalCV(`${ESCROW_CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}`),
        ],
        postConditions: [],
      } as any);
      alert(`Withdrawal submitted! TX: ${data.txid}`);
      setTimeout(() => loadStreams(address!), 5000);

    } catch (e: any) {
      alert("Failed: " + e.message);
    }
  }

  if (!mounted) return null;

  const myStreams = streams.filter((s) => s.payer === address);
  const incomingStreams = streams.filter((s) => s.payee === address);

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Streams & Escrow</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: "0.875rem", marginTop: 4 }}>
            Lock STX into a time-based payment stream for compute/services
          </p>
        </div>
        <WalletConnect />
      </div>

      {!address ? (
        <div className="panel" style={{ textAlign: "center", padding: "64px 24px" }}>
          <h3 style={{ marginBottom: 8 }}>Connect your wallet to view streams</h3>
          <p style={{ color: "var(--fg-dim)", marginBottom: 24, fontSize: "0.9rem" }}>Stream management requires wallet authentication</p>
          <WalletConnect />
        </div>
      ) : (
        <>
          <div className="panel" style={{ marginBottom: '24px' }}>
            <div className="panel-title">Create a New Payment Stream</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--fg-dim)', marginBottom: 4 }}>Payee Address</label>
                <input
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  placeholder="ST2..."
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--fg-dim)', marginBottom: 4 }}>Total Amount (µSTX)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--fg-dim)', marginBottom: 4 }}>Duration (Blocks)</label>
                <input
                  type="number"
                  value={durationBlocks}
                  onChange={(e) => setDurationBlocks(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--fg)' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                <button onClick={createStream} disabled={creating} className="status settled" style={{ width: '100%', border: 'none', padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                  {creating ? "Signing..." : "Create Stream"}
                </button>
              </div>
            </div>
          </div>

          <div className="panels">
            <div className="panel">
              <div className="panel-title" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Outgoing Streams</span>
                <button onClick={() => loadStreams(address!)} disabled={loading} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer' }}>
                  {loading ? "Refreshing..." : "↺ Refresh"}
                </button>
              </div>
              {myStreams.length === 0 ? (
                <div style={{ color: "var(--fg-dim)", padding: "24px 0", textAlign: "center", fontSize: '0.875rem' }}>No active outgoing streams.</div>
              ) : myStreams.map((s) => (
                <div key={s.streamId} className="token-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span className="mono" style={{ fontSize: '0.75rem' }}>Stream #{s.streamId}</span>
                    <span className={s.settled ? "status pending" : "status settled"}>{s.settled ? "SETTLED" : "ACTIVE"}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                    To: {s.payee.slice(0, 8)}...{s.payee.slice(-4)} · {s.totalDeposited.toLocaleString()} µSTX
                  </div>
                </div>
              ))}
            </div>

            <div className="panel">
              <div className="panel-title">Incoming Streams</div>
              {incomingStreams.length === 0 ? (
                <div style={{ color: "var(--fg-dim)", padding: "24px 0", textAlign: "center", fontSize: '0.875rem' }}>No incoming streams.</div>
              ) : incomingStreams.map((s) => (
                <div key={s.streamId} className="token-row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem' }}>From: {s.payer.slice(0, 8)}...</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--fg-dim)' }}>{s.totalDeposited.toLocaleString()} µSTX</div>
                  </div>
                  {!s.settled && (
                    <button onClick={() => withdrawFromStream(s.streamId)} className="status settled" style={{ border: 'none', cursor: 'pointer' }}>Withdraw</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

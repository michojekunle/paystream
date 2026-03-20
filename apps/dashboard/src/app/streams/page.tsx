"use client";

import { useState, useEffect } from "react";
import { openContractCall } from "@stacks/connect";
import {
  callReadOnlyFunction,
  uintCV,
  principalCV,
  standardPrincipalCV,
  cvToValue,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
  makeContractSTXPostCondition,
} from "@stacks/transactions";
import { StacksTestnet } from "@stacks/network";
import { userSession, getUserAddress } from "../../lib/stacks-session";
import { WalletConnect } from "../../components/WalletConnect";
import { Sidebar } from "../../components/Sidebar";

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
      // Limit to last 20 streams for performance
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
      await openContractCall({
        network: NETWORK,
        contractAddress: ESCROW_CONTRACT_ADDRESS,
        contractName: ESCROW_CONTRACT_NAME,
        functionName: "create-stream",
        functionArgs: [
          standardPrincipalCV(payee),
          // STX native — we pass the xSTX contract as a stand-in token for now
          principalCV(`${ESCROW_CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}`),
          uintCV(Number(amount)),
          uintCV(Number(durationBlocks)),
        ],
        postConditions: [
          makeStandardSTXPostCondition(address, FungibleConditionCode.Equal, BigInt(amount)),
        ],
        onFinish: (data) => {
          console.log("Stream created! txid:", data.txId);
          alert(`Stream created! TX: ${data.txId}`);
          setCreating(false);
          setTimeout(() => loadStreams(address!), 5000);
        },
        onCancel: () => setCreating(false),
        userSession,
        appDetails: { name: "PayStream", icon: "" },
      });
    } catch (e: any) {
      console.error(e);
      alert("Failed to open wallet: " + e.message);
      setCreating(false);
    }
  }

  async function withdrawFromStream(streamId: number) {
    if (!address) return alert("Connect your wallet first.");
    try {
      await openContractCall({
        network: NETWORK,
        contractAddress: ESCROW_CONTRACT_ADDRESS,
        contractName: ESCROW_CONTRACT_NAME,
        functionName: "withdraw",
        functionArgs: [
          uintCV(streamId),
          principalCV(`${ESCROW_CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}`),
        ],
        postConditions: [],
        onFinish: (data) => {
          alert(`Withdrawal submitted! TX: ${data.txId}`);
          setTimeout(() => loadStreams(address!), 5000);
        },
        onCancel: () => {},
        userSession,
        appDetails: { name: "PayStream", icon: "" },
      });
    } catch (e: any) {
      alert("Failed: " + e.message);
    }
  }

  if (!mounted) return null;

  const myStreams = streams.filter((s) => s.payer === address);
  const incomingStreams = streams.filter((s) => s.payee === address);

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
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif; font-size: 14px; }
        .layout { display: flex; min-height: 100vh; }
        .main { margin-left: 220px; flex: 1; padding: 2rem; }
        .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .card-title { font-size: 0.85rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 1rem; }
        label { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 4px; }
        input, select { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; color: var(--text); font-size: 0.875rem; margin-bottom: 12px; }
        .badge { padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; }
        .stream-row { border-bottom: 1px solid var(--border); padding: 12px 0; display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 0.85rem; }
        .stream-row:last-child { border-bottom: none; }
        .btn { border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: 600; font-size: 0.875rem; }
        .btn-primary { background: var(--accent); color: #000; }
        .btn-secondary { background: transparent; color: var(--text); border: 1px solid var(--border); }
        .btn-sm { padding: 4px 10px; font-size: 0.75rem; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 660px) { .grid-2 { grid-template-columns: 1fr; } main { margin-left: 0; } }
      `}</style>

      <div className="layout">
        <Sidebar activePage="streams" />
        <main className="main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Streams & Escrow</h1>
              <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: 4 }}>Lock STX into a time-based payment stream</p>
            </div>
            <WalletConnect />
          </div>

          {!address ? (
            <div style={{ border: "1px dashed var(--border)", borderRadius: 12, padding: "64px 24px", textAlign: "center" }}>
              <h3 style={{ marginBottom: 8 }}>Connect your wallet to view streams</h3>
              <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: "0.9rem" }}>Stream management requires wallet authentication</p>
              <WalletConnect />
            </div>
          ) : (
            <>
              {/* Create Stream */}
              <div className="card">
                <div className="card-title">Create a New Payment Stream</div>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
                  Lock STX into escrow, releasing it per-block to a payee for long-running compute jobs.
                </p>
                <div className="grid-2">
                  <div>
                    <label>Payee Address (STX)</label>
                    <input
                      value={payee}
                      onChange={(e) => setPayee(e.target.value)}
                      placeholder="ST2..."
                    />
                  </div>
                  <div>
                    <label>Total Amount (µSTX)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Duration (Stacks blocks)</label>
                    <input
                      type="number"
                      value={durationBlocks}
                      onChange={(e) => setDurationBlocks(e.target.value)}
                    />
                    <small style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                      ≈ {Math.round(Number(durationBlocks) * 10 / 60)} min · rate: {durationBlocks > "0" ? Math.floor(Number(amount) / Number(durationBlocks)) : 0} µSTX/block
                    </small>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "12px" }}>
                    <button className="btn btn-primary" disabled={creating} onClick={createStream} style={{ width: "100%" }}>
                      {creating ? "Awaiting Signature..." : "Create Stream ↗"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Streams */}
              <div className="card">
                <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>My Active Streams (Payer)</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => loadStreams(address!)} disabled={loading}>
                    {loading ? "Loading..." : "↺ Refresh"}
                  </button>
                </div>
                {loading ? (
                  <div style={{ color: "var(--muted)", padding: "24px 0", textAlign: "center" }}>Loading streams from chain...</div>
                ) : myStreams.length === 0 ? (
                  <div style={{ color: "var(--muted)", padding: "24px 0", textAlign: "center" }}>No active outgoing streams.</div>
                ) : myStreams.map((s) => {
                  const progress = Math.min(100, ((s.withdrawn / s.totalDeposited) * 100) || 0);
                  const isActive = !s.settled;
                  return (
                    <div className="stream-row" key={s.streamId}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span className="badge" style={{ background: isActive ? "rgba(74,168,96,0.15)" : "rgba(255,255,255,0.05)", color: isActive ? "#4aa860" : "var(--muted)" }}>
                            {isActive ? "● ACTIVE" : "SETTLED"}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "monospace" }}>
                            Stream #{s.streamId}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 6 }}>
                          To: <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{s.payee.slice(0, 8)}...{s.payee.slice(-4)}</span>
                          &nbsp;·&nbsp;
                          {s.ratePerBlock} µSTX/block
                          &nbsp;·&nbsp;
                          ends block {s.endBlock}
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${progress}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.4s" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>
                          <span>{s.withdrawn.toLocaleString()} µSTX paid out</span>
                          <span>{s.totalDeposited.toLocaleString()} µSTX total</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Incoming Streams */}
              <div className="card">
                <div className="card-title">Incoming Streams (Payee)</div>
                {loading ? (
                  <div style={{ color: "var(--muted)", padding: "24px 0", textAlign: "center" }}>Loading...</div>
                ) : incomingStreams.length === 0 ? (
                  <div style={{ color: "var(--muted)", padding: "24px 0", textAlign: "center" }}>No incoming payment streams.</div>
                ) : incomingStreams.map((s) => (
                  <div className="stream-row" key={s.streamId}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span className="badge" style={{ background: "rgba(212,146,42,0.15)", color: "var(--accent)" }}>
                          INCOMING
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "monospace" }}>
                          Stream #{s.streamId}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                        From: <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{s.payer.slice(0, 8)}...{s.payer.slice(-4)}</span>
                        &nbsp;·&nbsp;
                        {s.ratePerBlock} µSTX/block
                        &nbsp;·&nbsp;
                        {s.totalDeposited.toLocaleString()} µSTX total locked
                      </div>
                    </div>
                    {!s.settled && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => withdrawFromStream(s.streamId)}
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ padding: "12px 0", color: "var(--muted)", fontSize: "0.8rem", textAlign: "center" }}>
                Contract: <a
                  href={`https://explorer.hiro.so/address/${ESCROW_CONTRACT_ADDRESS}.${ESCROW_CONTRACT_NAME}?chain=testnet`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--accent)", fontFamily: "monospace" }}
                >
                  {ESCROW_CONTRACT_ADDRESS.slice(0, 8)}...{ESCROW_CONTRACT_NAME}
                </a>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}

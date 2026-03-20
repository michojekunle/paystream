"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal as TerminalIcon, 
  Send, 
  Cpu, 
  Wallet, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { AgentWallet } from "@paystream/client";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface LogEntry {
  type: "info" | "request" | "response" | "action" | "success" | "error";
  message: string;
  timestamp: string;
  data?: any;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3402";
const DEFAULT_PROMPT = "Explain the importance of x402 for AI agents.";

/* ─── Components ─────────────────────────────────────────────────────────── */

function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 24V8h6l4 4-4 4h-6" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M4 16c4 0 6-4 12-4s8 4 12 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M4 21c4 0 6-4 12-4s8 4 12 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function ShowcasePage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [balance, setBalance] = useState<{ stx: string; sbtc: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry["type"], message: string, data?: any) => {
    setLogs(prev => [...prev.slice(-49), {
      type,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      data
    }]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const runAgent = async () => {
    if (!privateKey && !showKeyInput) {
      setShowKeyInput(true);
      return;
    }
    if (!privateKey) return;

    setIsRunning(true);
    setResult(null);
    setLogs([]);
    addLog("info", "Initializing AI Researcher Agent...");

    try {
      // 1. Initialize AgentWallet
      const agent = new AgentWallet({
        key: privateKey,
        network: "testnet",
        budget: {
          perTx: 1000000n, // 1 STX
          perDay: 10000000n, // 10 STX
        }
      });

      addLog("action", "AgentWallet initialized with budget limits.");
      addLog("request", `→ POST /api/ai/generate`, { prompt });

      // 2. Perform autonomous fetch
      // Note: we override the global fetch in the agent, but here we call agent.fetch directly
      const startTime = Date.now();
      
      // We wrap the agent.fetch to capture the internal retries for the log
      // In a real app, you'd just call await agent.fetch()
      const response = await agent.fetch(`${API_URL}/api/ai/generate?prompt=${encodeURIComponent(prompt)}`, {
        method: "GET" // demo-server uses GET for ai/generate right now based on our previous edits
      });

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        const data = await response.json();
        addLog("success", `✓ 200 OK — Handled 402 autonomously.`, { duration: `${duration}ms` });
        setResult(data.text || data.result || "Processing complete.");
        addLog("info", "Objective reached. Terminating session.");
      } else {
        const errText = await response.text();
        addLog("error", `Status ${response.status}: ${errText}`);
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred.";
      addLog("error", msg);
      
      if (msg.includes("Budget") || msg.includes("Payment Failed")) {
        addLog("info", "Tip: Check your testnet balance or increase the agent budget in configuration.");
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="showcase-container">
      <style>{`
        :root {
          --bg: #0a0a09;
          --surface: #111110;
          --border: rgba(255,255,255,0.07);
          --accent: #d4922a;
          --text: #e8e0d4;
          --muted: #6b6760;
          --term-bg: #0d0d0c;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif; }
        .showcase-container { min-height: 100vh; display: flex; flex-direction: column; padding: 2rem; max-width: 1000px; margin: 0 auto; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
        .logo { display: flex; align-items: center; gap: 0.75rem; color: var(--accent); font-weight: 700; text-decoration: none; }
        
        .grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 2rem; flex: 1; }
        @media (max-width: 850px) { .grid { grid-template-columns: 1fr; } }

        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; display: flex; flex-direction: column; }
        .panel-title { font-size: 0.8rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px; }

        .terminal { background: var(--term-bg); border: 1px solid var(--border); border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 13px; padding: 1rem; flex: 1; overflow-y: auto; color: #a0a09a; line-height: 1.5; }
        .log-entry { margin-bottom: 4px; display: flex; gap: 12px; }
        .log-time { color: #444; flex-shrink: 0; }
        .log-msg.info { color: #888; }
        .log-msg.request { color: var(--accent); }
        .log-msg.action { color: #88aaff; }
        .log-msg.success { color: #4aa860; }
        .log-msg.error { color: #ff5555; }

        input, textarea { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 6px; padding: 12px; color: var(--text); font-family: inherit; margin-bottom: 1rem; outline: none; transition: border 0.2s; }
        input:focus { border-color: var(--accent); }
        
        .btn { border: none; border-radius: 6px; padding: 12px 24px; cursor: pointer; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
        .btn-primary { background: var(--accent); color: #000; }
        .btn-primary:hover { background: #eab45b; transform: translateY(-1px); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .result-box { margin-top: 1.5rem; padding: 1rem; background: rgba(212,146,42,0.05); border: 1px solid rgba(212,146,42,0.2); border-radius: 8px; font-size: 0.9rem; color: #d8c8b0; line-height: 1.6; }
        .key-prompt { background: #1a1a18; border: 1px solid #332211; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
      `}</style>

      <header>
        <a href="/" className="logo">
          <LogoMark className="w-8 h-8" />
          <span>PayStream</span>
        </a>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Flagship Demo: Autonomous AI Agent
        </div>
      </header>

      <main className="grid">
        {/* Left: Configuration & Input */}
        <section className="panel">
          <div className="panel-title"><Cpu size={16} /> Agent Configuration</div>
          
          <label style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 8 }}>Research Objective</label>
          <textarea 
            value={prompt} 
            onChange={e => setPrompt(e.target.value)}
            disabled={isRunning}
            style={{ height: 80, resize: 'none' }}
          />

          {!privateKey && showKeyInput && (
            <div className="key-prompt">
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, color: 'var(--accent)' }}>Funding Required</div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 12 }}>
                Enter a Stacks Testnet Private Key. The agent will use it to sign x402 payments autonomously.
              </p>
              <input 
                type="password" 
                placeholder="0x... (Private Key Hex)" 
                value={privateKey}
                onChange={e => setPrivateKey(e.target.value)}
              />
              <p style={{ fontSize: '0.7rem', color: '#888' }}>
                Don't have a key? Get testnet STX from the <a href="https://explorer.hiro.so/sandbox/faucet?chain=testnet" target="_blank" style={{ color: 'var(--accent)' }}>Hiro Faucet</a>.
              </p>
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={runAgent} 
            disabled={isRunning || (!privateKey && showKeyInput && !privateKey)}
          >
            {isRunning ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {isRunning ? "Researching..." : "Launch Researcher Agent"}
          </button>

          {result && (
            <div className="result-box">
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)' }}>Research Result</div>
              {result}
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            <div className="panel-title" style={{ marginBottom: 12 }}><Wallet size={16} /> Agent Payer Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>STX USED</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{isRunning ? "..." : "0"} <span style={{ fontSize: 10, fontWeight: 400 }}>STX</span></div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>TX AUTONOMY</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>100%</div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Live Terminal */}
        <section className="panel">
          <div className="panel-title" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TerminalIcon size={16} /> Live Execution Feed
            </div>
            {isRunning && (
              <span style={{ fontSize: '0.7rem', color: '#4aa860', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, background: '#4aa860', borderRadius: '50%', boxShadow: '0 0 6px #4aa860' }} />
                AGENT ONLINE
              </span>
            )}
          </div>
          
          <div className="terminal" ref={scrollRef}>
            {logs.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                Waiting for agent initialization...
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="log-entry">
                  <span className="log-time">[{log.timestamp}]</span>
                  <div className={`log-msg ${log.type}`}>
                    {log.message}
                    {log.data && (
                      <pre style={{ fontSize: 11, background: 'rgba(255,255,255,0.02)', padding: '4px 8px', marginTop: 4, borderRadius: 4, borderLeft: '2px solid #333' }}>
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--muted)' }}>
            <div>x402 Protocol v0.1.0</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span>Settlement: Testnet</span>
              <span>Network: Stacks</span>
            </div>
          </div>
        </section>
      </main>

      <footer style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.8rem' }}>
        <div>© 2026 PayStream. Autonomous Bitcoin Micropayments.</div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="/docs/developer" style={{ color: 'inherit', textDecoration: 'none' }}>Documentation</a>
          <a href="/protocol" style={{ color: 'inherit', textDecoration: 'none' }}>Protocol Spec</a>
          <a href="https://github.com/michojekunle/paystream" style={{ color: 'inherit', textDecoration: 'none' }}>GitHub</a>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { CheckCircle2, Cpu, Rocket, Shield, Target, ExternalLink } from "lucide-react";

function LogoMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 24V8h6l4 4-4 4h-6" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M4 16c4 0 6-4 12-4s8 4 12 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function RoadmapPage() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header>
        <nav className="nav" aria-label="Primary navigation">
          <div className="nav-inner">
            <a href="/" className="nav-logo" aria-label="PayStream home">
              <LogoMark className="nav-logo-mark" />
              PayStream
            </a>
            <ul className="nav-links">
              <li><a href="/protocol">Protocol</a></li>
              <li><a href="/roadmap" style={{ color: "var(--accent)" }}>Roadmap</a></li>
              <li><a href="/docs/developer">SDK / Dev</a></li>
              <li><a href="/docs/user">Dashboard</a></li>
            </ul>
            <a href="https://github.com/michojekunle/paystream" className="nav-cta" target="_blank" rel="noopener noreferrer">
              GitHub <span aria-hidden="true">→</span>
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
              Vision & Strategy
            </div>
            <h1 id="hero-title">
              Building the future <br />
              <span className="accent">machine economy</span>.
            </h1>
            <p>
              A transparent look at what PayStream is capable of today, and our ambitious goals for building frictionless, Bitcoin-native payments tomorrow.
            </p>
          </div>
        </section>

        {/* ── Phase 1 ─────────────────────────────────────────────── */}
        <div className="section" id="phase-1">
          <div className="wrap">
            <div className="section-head">
              <span className="section-label" style={{ color: "#4aa860" }}>● Available Now</span>
              <h2>Phase 1: Testnet MVP</h2>
              <p>We've successfully established the critical foundation. Integrate PayStream into your backend today to experience entirely autonomous, frictionless HTTP payments.</p>
            </div>
            
            <div className="features" role="list">
              <article className="feat" role="listitem">
                <div className="feat-icon" aria-hidden="true" style={{ color: "#4aa860" }}><CheckCircle2 size={24} /></div>
                <h3>x402 Interceptor</h3>
                <p>Native HTTP 402 integration wrapper allows clients to intercept 402 errors, negotiate prices, sign payloads, and automatically retry failed API requests transparently.</p>
              </article>
              <article className="feat" role="listitem">
                <div className="feat-icon" aria-hidden="true" style={{ color: "#4aa860" }}><Cpu size={24} /></div>
                <h3>AgentWallet</h3>
                <p>A sophisticated node-only wallet designed for AI agents to securely sign and spend Stacks tokens autonomously, governed strictly by developer-defined configuration.</p>
              </article>
              <article className="feat" role="listitem">
                <div className="feat-icon" aria-hidden="true" style={{ color: "#4aa860" }}><Target size={24} /></div>
                <h3>Clarity Escrow</h3>
                <p>Deployed smart contracts enabling real-time, trustless streams by-the-block. Perfect for GPU compute, streaming media, and prolonged API utilization.</p>
              </article>
              <article className="feat" role="listitem">
                <div className="feat-icon" aria-hidden="true" style={{ color: "#4aa860" }}><Rocket size={24} /></div>
                <h3>Bitflow DEX</h3>
                <p>Native support for cross-token seamless swaps. Pay in sBTC while the API receives USDCx, executing trades completely automatically on Stacks.</p>
              </article>
            </div>
          </div>
        </div>

        {/* ── Phase 2 ─────────────────────────────────────────────── */}
        <div className="section" id="phase-2">
          <div className="wrap">
            <div className="section-head">
              <span className="section-label" style={{ color: "var(--accent)" }}>○ Future Vision</span>
              <h2>Phase 2: Global Scale</h2>
              <p>Our ultimate goal transcends wrapping HTTP requests. We aim to become the universal standard connecting every AI and API through a completely decentralized layer.</p>
            </div>
            
            <div className="features" role="list">
              <article className="feat" role="listitem">
                <div className="feat-icon" aria-hidden="true" style={{ color: "var(--accent)" }}><Shield size={24} /></div>
                <h3>Complete Decentralization</h3>
                <p>Retiring the centralized PayStream facilitator in favor of fully peer-to-peer state channels using Lightning/sBTC, removing choke points.</p>
              </article>
              <article className="feat" role="listitem">
                <div className="feat-icon" aria-hidden="true" style={{ color: "var(--accent)" }}><ExternalLink size={24} /></div>
                <h3>Universal Ecosystem</h3>
                <p>A native, lightweight protocol library available in Rust, Go, Python, and Ruby enabling any developer framework to securely participate.</p>
              </article>
              <article className="feat" role="listitem">
                <div className="feat-icon" aria-hidden="true" style={{ color: "var(--accent)" }}><Cpu size={24} /></div>
                <h3>Frictionless Machine Economics</h3>
                <p>Widespread autonomous AI integrations where software agents negotiate, budget, and pay one another for data collection and compute entirely on their own.</p>
              </article>
              <article className="feat" role="listitem">
                <div className="feat-icon" aria-hidden="true" style={{ color: "var(--accent)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                </div>
                <h3>Sub-second Settlement</h3>
                <p>Scaling through L2/L3 solutions atop Bitcoin to facilitate sub-second, instant micropayments suitable for data grids and robotic process automation.</p>
              </article>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="footer">
        <div className="wrap footer-inner">
          <div>
            <div className="footer-brand">
              <LogoMark className="accent" style={{ width: "24px", height: "24px", marginRight: "6px" }} />
              PayStream
            </div>
            <span className="footer-copy">Bitcoin-native micropayments for the AI economy</span>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <a href="https://github.com/michojekunle/paystream" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="/docs">Docs</a>
            <a href="https://x402.org" target="_blank" rel="noopener noreferrer">x402</a>
            <a href="https://stacks.co" target="_blank" rel="noopener noreferrer">Stacks</a>
          </nav>
        </div>
      </footer>
    </>
  );
}

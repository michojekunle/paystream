"use client";

import { userSession } from "../lib/stacks-session";

interface SidebarProps {
  activePage?: string;
}

export function Sidebar({ activePage = "overview" }: SidebarProps) {
  const online = true; // Passed from parent or checked globally

  const navItems = [
    { icon: "▦", label: "Overview", href: "/", page: "overview" },
    { icon: "⚡", label: "Transactions", href: "#", page: "transactions" },
    { icon: "◎", label: "Streams", href: "/streams", page: "streams" },
    { icon: "⇄", label: "Swaps", href: "#", page: "swaps" },
    { icon: "⬡", label: "Agents", href: "#", page: "agents" },
    { icon: "◈", label: "Contracts", href: "#", page: "contracts" },
  ];

  return (
    <aside
      style={{
        width: 220,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        padding: "2rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        position: "fixed",
        height: "100vh",
        overflowY: "auto",
      }}
      aria-label="Navigation"
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "var(--accent)",
          fontWeight: 700,
          fontSize: "1rem",
          letterSpacing: "-0.01em",
        }}
      >
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: 28, height: 28 }}>
          <path d="M12 24V8h6l4 4-4 4h-6" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M4 16c4 0 6-4 12-4s8 4 12 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M4 21c4 0 6-4 12-4s8 4 12 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span>PayStream</span>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }} aria-label="Main navigation">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-current={activePage === item.page ? "page" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              cursor: "pointer",
              color: activePage === item.page ? "var(--accent)" : "var(--muted)",
              background: activePage === item.page ? "rgba(212,146,42,0.1)" : "transparent",
              fontSize: "0.875rem",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      {/* Status */}
      <div
        style={{
          marginTop: "auto",
          padding: "0.75rem",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "8px",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: "0.75rem", marginBottom: 6, color: "var(--muted)" }}>API Server</div>
        <div style={{ fontSize: "0.8rem", marginBottom: 12 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              display: "inline-block",
              marginRight: 6,
              background: online ? "#4aa860" : "#888",
              boxShadow: online ? "0 0 6px #4aa860" : "none",
            }}
          />
          {online ? "Online" : "Offline"}
        </div>
        
        <a 
          href="https://explorer.hiro.so/sandbox/faucet?chain=testnet" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ 
            fontSize: "0.7rem", 
            color: "var(--accent)", 
            textDecoration: "none", 
            display: "block",
            borderTop: "1px solid var(--border)",
            paddingTop: "0.5rem",
            marginTop: "0.5rem"
          }}
        >
          Need Testnet STX? ↗
        </a>
      </div>
    </aside>
  );
}

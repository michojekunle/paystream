"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface SidebarProps {
  online?: boolean;
  version?: string;
  protocol?: string;
}

export function Sidebar({ online = true, version = "1.0.0", protocol = "x402" }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { icon: "▦", label: "Overview", href: "/", page: "overview" },
    { icon: "⚡", label: "Transactions", href: "/transactions", page: "transactions" },
    { icon: "◎", label: "Streams", href: "/streams", page: "streams" },
    { icon: "⇄", label: "Swaps", href: "/swaps", page: "swaps" },
    { icon: "⬡", label: "Agents", href: "/agents", page: "agents" },
    { icon: "◈", label: "Contracts", href: "/contracts", page: "contracts" },
  ];

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <aside className="sidebar" aria-label="Navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: 28, height: 28 }}>
          <path d="M12 24V8h6l4 4-4 4h-6" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M4 16c4 0 6-4 12-4s8 4 12 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M4 21c4 0 6-4 12-4s8 4 12 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span>PayStream</span>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }} aria-label="Main navigation">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={isActive(item.href) ? "active" : ""}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Status */}
      <div
        style={{
          marginTop: "auto",
          padding: "1rem",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: "0.75rem", marginBottom: 6, color: "var(--fg-dim)" }}>API Server</div>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: online ? "var(--green)" : "var(--fg-dim)",
              boxShadow: online ? "0 0 8px var(--green)" : "none",
            }}
          />
          {online ? "Online" : "Offline"}
        </div>
        
        {online && (
          <div style={{ marginTop: 8, fontSize: "0.7rem", color: "var(--fg-dim)" }}>
            v{version} · {protocol}
          </div>
        )}

        <a 
          href="https://explorer.hiro.so/sandbox/faucet?chain=testnet" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ 
            fontSize: "0.72rem", 
            color: "var(--accent)", 
            textDecoration: "none", 
            display: "block",
            borderTop: "1px solid var(--border)",
            paddingTop: "0.75rem",
            marginTop: "0.75rem",
            fontWeight: 500
          }}
        >
          Need Testnet STX? ↗
        </a>
      </div>
    </aside>
  );
}

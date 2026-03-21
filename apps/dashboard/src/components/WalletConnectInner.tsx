"use client";

import { useState, useEffect } from "react";
import { connect, disconnect } from "@stacks/connect";
import { getUserAddress } from "../lib/stacks-session";

// This component is NEVER rendered on the server — it is always loaded via
// next/dynamic with ssr:false from WalletConnect.tsx
export default function WalletConnectInner() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setAddress(getUserAddress());
  }, []);

  const authenticate = async () => {
    try {
      await connect();
      setAddress(getUserAddress());
    } catch (e) {
      console.error(e);
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setAddress(null);
  };

  if (address) {
    return (
      <button
        onClick={disconnectWallet}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--border)",
          color: "var(--fg)",
          padding: "8px 16px",
          borderRadius: "6px",
          fontSize: "0.85rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4aa860" }} />
        {address.slice(0, 5)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={authenticate}
      style={{
        background: "var(--accent)",
        border: "none",
        color: "#000",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Connect Wallet
    </button>
  );
}

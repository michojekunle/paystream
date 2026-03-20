"use client";

import { useState, useEffect } from "react";
import { showConnect } from "@stacks/connect";
import { getSession, getUserAddress } from "../lib/stacks-session";

// This component is NEVER rendered on the server — it is always loaded via
// next/dynamic with ssr:false from WalletConnect.tsx
export default function WalletConnectInner() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    if (session.isSignInPending()) {
      session.handlePendingSignIn().then(() => {
        setAddress(getUserAddress());
      });
    } else if (session.isUserSignedIn()) {
      setAddress(getUserAddress());
    }
  }, []);

  const authenticate = () => {
    const session = getSession();
    if (!session) return;
    showConnect({
      appDetails: {
        name: "PayStream Merchant",
        icon: window.location.origin + "/icon.svg",
      },
      redirectTo: "/",
      onFinish: () => {
        setAddress(getUserAddress());
      },
      userSession: session,
    });
  };

  const disconnect = () => {
    getSession()?.signUserOut("/");
    setAddress(null);
  };

  if (address) {
    return (
      <button
        onClick={disconnect}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--border)",
          color: "var(--text)",
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
        color: "#fff",
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

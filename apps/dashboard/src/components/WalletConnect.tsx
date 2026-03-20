"use client";

import { useState, useEffect } from "react";
import { showConnect } from "@stacks/connect";
import { userSession, getUserAddress } from "../lib/stacks-session";

export function WalletConnect() {
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then(() => {
        setAddress(getUserAddress());
      });
    } else if (userSession.isUserSignedIn()) {
      setAddress(getUserAddress());
    }
  }, []);

  const authenticate = () => {
    showConnect({
      appDetails: {
        name: "PayStream Merchant",
        icon: typeof window !== "undefined" ? window.location.origin + "/icon.svg" : "",
      },
      redirectTo: "/",
      onFinish: () => {
        setAddress(getUserAddress());
      },
      userSession,
    });
  };

  const disconnect = () => {
    userSession.signUserOut("/");
    setAddress(null);
  };

  if (!mounted) return null;

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
          gap: "8px"
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

"use client";

import dynamic from "next/dynamic";

// Dynamically import the real wallet component — zero SSR, avoids @stacks/connect
// breaking Turbopack with browser-only module factories at build time.
const WalletConnectInner = dynamic(() => import("./WalletConnectInner"), {
  ssr: false,
  loading: () => (
    <button
      disabled
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.07)",
        color: "rgba(255,255,255,0.3)",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "0.85rem",
        cursor: "not-allowed",
      }}
    >
      Loading…
    </button>
  ),
});

export function WalletConnect() {
  return <WalletConnectInner />;
}

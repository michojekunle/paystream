"use client";

import { useState } from "react";

export function SnippetGenerator() {
  const [endpoint, setEndpoint] = useState("/api/generate");
  const [price, setPrice] = useState("1000");
  const [token, setToken] = useState("STX");

  const serverSnippet = `import express from "express";
import { paywall } from "@devvmichael/paystream-server";

const app = express();

app.get("${endpoint}", paywall({
  price: ${price},        // micro-${token}
  acceptedToken: "${token}", // Token ticker
}), (req, res) => {
  // Request was paid for, process here
  res.json({ success: true, payer: req.paystream.payer });
});

app.listen(3000);`;

  const clientSnippet = `import { AgentWallet } from "@devvmichael/paystream-client";

// Initializes wallet using private key from env
const wallet = new AgentWallet(process.env.PRIVATE_KEY);

async function callPaywalledAPI() {
  try {
    const response = await wallet.fetch("http://localhost:3000${endpoint}");
    console.log("Success:", response.data);
  } catch (err) {
    console.error("API call failed:", err);
  }
}

callPaywalledAPI();`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Endpoint Path</label>
          <input 
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            style={{ 
              width: "100%", 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid var(--border)", 
              borderRadius: "6px", 
              padding: "8px 12px", 
              color: "var(--text)" 
            }} 
          />
        </div>
        <div style={{ flex: 1, minWidth: "120px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Price (micro-units)</label>
          <input 
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ 
              width: "100%", 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid var(--border)", 
              borderRadius: "6px", 
              padding: "8px 12px", 
              color: "var(--text)" 
            }} 
          />
        </div>
        <div style={{ width: "120px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", marginBottom: "4px" }}>Token</label>
          <select 
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ 
              width: "100%", 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid var(--border)", 
              borderRadius: "6px", 
              padding: "8px 12px", 
              color: "var(--text)" 
            }}
          >
            <option value="STX">STX</option>
            <option value="sBTC">sBTC</option>
            <option value="USDCx">USDCx</option>
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h4 style={{ fontSize: "0.85rem", color: "var(--text)" }}>1. Protect Endpoint (Express)</h4>
            <button onClick={() => copyToClipboard(serverSnippet)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.75rem" }}>Copy</button>
          </div>
          <pre style={{ 
            background: "rgba(0,0,0,0.5)", 
            padding: "16px", 
            borderRadius: "8px", 
            border: "1px solid var(--border)",
            overflowX: "auto",
            fontSize: "0.8rem",
            color: "#a0a0a0"
          }}>
            <code>{serverSnippet}</code>
          </pre>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h4 style={{ fontSize: "0.85rem", color: "var(--text)" }}>2. Call Endpoint (Agent/Client)</h4>
            <button onClick={() => copyToClipboard(clientSnippet)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "0.75rem" }}>Copy</button>
          </div>
          <pre style={{ 
            background: "rgba(0,0,0,0.5)", 
            padding: "16px", 
            borderRadius: "8px", 
            border: "1px solid var(--border)",
            overflowX: "auto",
            fontSize: "0.8rem",
            color: "#a0a0a0"
          }}>
            <code>{clientSnippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

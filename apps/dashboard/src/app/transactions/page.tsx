"use client";

import { useState, useEffect } from "react";
import { supabase, type PaymentReceipt } from "../../lib/supabase";
import { getUserAddress } from "../../lib/stacks-session";
import { WalletConnect } from "../../components/WalletConnect";

export default function TransactionsPage() {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const addr = getUserAddress();
    setAddress(addr);
    if (addr) fetchReceipts(addr);
  }, []);

  async function fetchReceipts(merchantAddress: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_receipts")
      .select("*")
      .eq("payee", merchantAddress)
      .order("settled_at", { ascending: false });
    
    if (!error && data) setReceipts(data as PaymentReceipt[]);
    setLoading(false);
  }

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Transactions</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: "0.875rem", marginTop: 4 }}>
            Verifiable payment history on Stacks
          </p>
        </div>
        <WalletConnect />
      </div>

      <div className="panel">
        <div className="panel-title">Master Ledger</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Transaction ID</th>
                <th>Sender</th>
                <th>Amount</th>
                <th>Token</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!address ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "64px" }}>Connect wallet to view history</td></tr>
              ) : loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "64px" }}>Fetching records...</td></tr>
              ) : receipts.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "64px" }}>No transactions found for this address</td></tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.settled_at).toLocaleDateString()}</td>
                    <td className="mono">
                      <a href={`https://explorer.hiro.so/txid/${r.tx_id}?chain=testnet`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                        {r.tx_id.slice(0, 10)}...
                      </a>
                    </td>
                    <td className="mono">{r.payer.slice(0, 6)}...{r.payer.slice(-4)}</td>
                    <td className="mono">{Number(r.amount).toLocaleString()}</td>
                    <td>{r.token}</td>
                    <td><span className="status settled">SETTLED</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

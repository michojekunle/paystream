"use client";

import { WalletConnect } from "../../components/WalletConnect";

export default function AgentsPage() {
  const agents = [
    { id: "ag-01", name: "Settlement Agent 01", status: "online", balance: "245.5 STX", uptime: "99.98%", lastActive: "12s ago" },
    { id: "ag-02", name: "Arbiter Agent 02", status: "online", balance: "12.8 STX", uptime: "99.95%", lastActive: "45s ago" },
    { id: "ag-03", name: "Backup Agent 03", status: "offline", balance: "0.0 STX", uptime: "84.22%", lastActive: "2d ago" },
  ];

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Autonomous Agents</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: "0.875rem", marginTop: 4 }}>
            Monitor the health and balances of the protocol's background workers
          </p>
        </div>
        <WalletConnect />
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-label">Active Agents</div>
          <div className="stat-val accent">2</div>
          <div className="stat-change up">+1 since last week</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Uptime</div>
          <div className="stat-val green">99.97%</div>
          <div className="stat-change">Operational</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Agent GAS (STX)</div>
          <div className="stat-val">258.3</div>
          <div className="stat-change down">-12.4 STX (24h)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Executions</div>
          <div className="stat-val">1,245</div>
          <div className="stat-change up">+45 in last hour</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Agent Fleet Status</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent Identifier</th>
                <th>Status</th>
                <th>Balance</th>
                <th>Avg Uptime</th>
                <th>Last Heartbeat</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((ag) => (
                <tr key={ag.id}>
                  <td className="mono">{ag.name}</td>
                  <td>
                    <span className={ag.status === "online" ? "status settled" : "status pending"}>
                      {ag.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="mono">{ag.balance}</td>
                  <td>{ag.uptime}</td>
                  <td>{ag.lastActive}</td>
                  <td>
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem' }}>View Logs</button>
                    &nbsp;·&nbsp;
                    <button style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.75rem' }}>Restart</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

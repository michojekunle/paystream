export const metadata = {
  title: "Dashboard User Guide | PayStream",
  description: "Learn how to use the PayStream User Dashboard.",
};

export default function UserGuide() {
  return (
    <>
      <div className="section-label">Users & Non-Devs</div>
      <h1>User Dashboard Guide</h1>

      <p>
        Not a developer? No problem. The <strong>PayStream Dashboard</strong> is
        where end-users, consumers, and AI operators manage their funds, set
        allowances, and track the exact micro-spending occurring across the
        Stacks ecosystem.
      </p>

      <h2>1. Accessing the Dashboard</h2>
      <p>
        If you are running the project locally, the dashboard is accessible at{" "}
        <code>http://localhost:3001</code>.
        <br />
        Log in by simply securely connecting your favorite Stacks wallet (e.g.
        Leather Wallet or Xverse).
      </p>

      <div className="docs-info">
        <p>
          <strong>Note:</strong> All operations inside PayStream are strictly{" "}
          <em>non-custodial</em>. We never hold your keys or your crypto. You
          simply sign standardized allowance streams natively.
        </p>
      </div>

      <h2>2. Understanding Allowances</h2>
      <p>
        Since HTTP 402 protocols are so fast (and micro-transactions occur in
        milliseconds), you shouldn't have to click "Approve" inside a wallet
        popup every time you generate a 5-cent AI image. Allowances solve this.
      </p>
      <ul>
        <li>
          <strong>Deposit Tokens:</strong> Deposit sBTC, STX, or USDCx via
          cross-chain swaps on the Dashboard.
        </li>
        <li>
          <strong>Set Stream Budgets:</strong> You can explicitly authorize an
          API Endpoint (e.g., <code>https://ai.service</code>) to withdraw a
          maximum of $5 per day without further prompting.
        </li>
        <li>
          <strong>Agent Assignment:</strong> You can delegate specific wallets
          as "AI Agents," allowing scripts running on your laptop to utilize
          your pre-approved balance safely.
        </li>
      </ul>

      <h2>3. Monitoring Spending In Real-Time</h2>
      <p>
        Your main dashboard view contains a graph breaking down <em>where</em>{" "}
        your micro-spending goes:
      </p>

      <div className="docs-step">
        <h4>Recent Transactions Log</h4>
        <p>
          The table provides you with exact on-chain receipts whenever your
          agent (or your browser tool) hits an API endpoint. You will see
          metrics like:
        </p>
        <ul style={{ marginBottom: 0 }}>
          <li>Amount Paid (e.g., 0.05 USDCx)</li>
          <li>Merchant / Receiving Entity</li>
          <li>Service Provided (e.g., GPU Compute / Chat Generation)</li>
          <li>Time & Date</li>
        </ul>
      </div>

      <h2>4. Reclaiming Funds</h2>
      <p>
        Since PayStream leverages smart contracts natively on Stacks, you can
        cancel an ongoing payment stream, revoke an allowance, and sweep any
        unused funds back to your Main Wallet directly from the Dashboard
        settings. The withdrawal occurs at the speed of the underlying network
        with mathematical certainty.
      </p>
    </>
  );
}

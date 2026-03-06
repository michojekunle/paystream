export const metadata = {
  title: "Documentation | PayStream",
  description:
    "Learn how to use PayStream for Web3 content and AI API monetization.",
};

export default function DocsOverview() {
  return (
    <>
      <div className="section-label">Overview</div>
      <h1>Introduction to PayStream</h1>

      <p>
        Welcome to the official <strong>PayStream</strong> documentation. We
        empower builders to effortlessly bridge Web3 and the AI economy by
        bringing HTTP 402 native micropayments to the Stacks Blockchain.
      </p>

      <div className="docs-info">
        <p>
          <strong>Heads Up:</strong> PayStream runs on non-custodial smart
          contracts and leverages Bitcoin-backed assets (like sBTC and STX)
          making sure settlements happen securely under two seconds.
        </p>
      </div>

      <h2>How It Works</h2>
      <p>
        The internet wasn't built for micro-transactions. PayStream fixes that
        by utilizing native <strong>x402</strong> protocols. Whether you're
        monetizing an AI LLM agent, video streams, or general APIs, PayStream
        abstracts away complex crypto UX leaving you with standard web hooks.
      </p>

      <ul>
        <li>
          <strong>For Developers:</strong> One-line middleware integration for
          your Express and NextJS endpoints.
        </li>
        <li>
          <strong>For Users:</strong> Frictionless, single-approval token
          allowances via the PayStream Dashboard.
        </li>
        <li>
          <strong>For Agents:</strong> Give your AI applications pre-funded
          allowances so they can browse, query, and compute autonomously over
          the web.
        </li>
      </ul>

      <h2>Get Started</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--s4)",
          marginTop: "var(--s8)",
        }}
      >
        <a
          href="/docs/developer"
          className="docs-step"
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          <h4>Developer Integration ⚙️</h4>
          <p style={{ fontSize: "0.9rem", color: "var(--fg-muted)" }}>
            Drop in our SDK and monetize any API with just a few lines of code.
          </p>
        </a>

        <a
          href="/docs/user"
          className="docs-step"
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          <h4>User & Dashboard Guide 👤</h4>
          <p style={{ fontSize: "0.9rem", color: "var(--fg-muted)" }}>
            Learn how to track spending, view your balance, and grant AI agents
            access.
          </p>
        </a>
      </div>
    </>
  );
}

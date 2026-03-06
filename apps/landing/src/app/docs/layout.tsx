import Link from "next/link";
import "./docs.css";

function LogoMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 24V8h6l4 4-4 4h-6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M4 16c4 0 6-4 12-4s8 4 12 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M4 21c4 0 6-4 12-4s8 4 12 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="docs-layout">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="docs-header">
        <nav className="nav" aria-label="Primary navigation">
          <div className="nav-inner">
            <Link href="/" className="nav-logo" aria-label="PayStream home">
              <LogoMark className="nav-logo-mark" />
              PayStream
            </Link>
            <ul className="nav-links">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/protocol">Protocol</Link>
              </li>
              <li>
                <Link href="/docs/developer">Dev Guide</Link>
              </li>
              <li>
                <Link href="/docs/user">User Guide</Link>
              </li>
              <li>
                <a
                  href="https://github.com/michojekunle/paystream"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </header>

      <div className="docs-container wrap">
        {/* Sidebar */}
        <aside className="docs-sidebar">
          <div className="docs-sidebar-sticky">
            <h3>Documentation</h3>
            <ul className="docs-sidebar-nav">
              <li>
                <div className="docs-sidebar-category">Introduction</div>
                <ul>
                  <li>
                    <Link href="/docs">Overview</Link>
                  </li>
                </ul>
              </li>
              <li>
                <div className="docs-sidebar-category">Developers</div>
                <ul>
                  <li>
                    <Link href="/docs/developer">Integration Guide</Link>
                  </li>
                </ul>
              </li>
              <li>
                <div className="docs-sidebar-category">Users</div>
                <ul>
                  <li>
                    <Link href="/docs/user">Dashboard & User Guide</Link>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </aside>

        {/* Content */}
        <main className="docs-main">{children}</main>
      </div>
    </div>
  );
}

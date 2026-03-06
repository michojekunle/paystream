export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header>
        <nav className="nav" aria-label="Primary navigation">
          <div className="nav-inner">
            <a href="/" className="nav-logo" aria-label="PayStream home">
              <svg
                className="nav-logo-mark"
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
              PayStream
            </a>
            <ul className="nav-links">
              <li>
                <a href="/protocol">Protocol</a>
              </li>
              <li>
                <a href="/docs/developer">SDK / Dev</a>
              </li>
              <li>
                <a href="/docs/user">Dashboard</a>
              </li>
            </ul>
            <a
              href="https://github.com/michojekunle/paystream"
              className="nav-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}

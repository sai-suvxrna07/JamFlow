export function Header() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">JamFlow</span>
        <nav className="text-sm text-muted">
          <a
            href="https://github.com"
            className="hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            About
          </a>
        </nav>
      </div>
    </header>
  );
}

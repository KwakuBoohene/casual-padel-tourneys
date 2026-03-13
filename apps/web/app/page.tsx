import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-padel-background text-padel-text flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-padel-muted font-semibold">Casual Padel Tourneys</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Live Tournament Viewer</h1>
          <p className="text-sm text-padel-muted">
            Paste or navigate to a share token from the organizer app to see live scores and standings.
          </p>
        </header>
        <section className="glass-card bg-padel-surface border border-padel-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-padel-muted">Example</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-padel-text">Demo public link</p>
              <p className="text-lg font-bold text-padel-primary">/tournament/demo</p>
            </div>
            <Link
              href="/tournament/demo"
              className="px-4 py-2 rounded-xl bg-padel-primary text-padel-background text-sm font-extrabold tracking-wide"
            >
              Open
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

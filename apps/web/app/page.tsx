import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-padel-navy to-slate-900 text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400 font-semibold">Padel Viewer</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Tournament Dashboard</h1>
          <p className="text-sm text-slate-400">
            Paste or navigate to a share token from the organizer app to see live scores and standings.
          </p>
        </header>
        <section className="glass-card bg-slate-800/60 border border-white/10 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Example</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Demo public link</p>
              <p className="text-lg font-bold text-padel-green">/tournament/demo</p>
            </div>
            <Link
              href="/tournament/demo"
              className="px-4 py-2 rounded-xl bg-padel-green text-slate-900 text-sm font-extrabold tracking-wide"
            >
              Open
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

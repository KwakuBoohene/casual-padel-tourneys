import { Link, Navigate } from "react-router-dom";
import { useAdminSession } from "./AdminSession";

export function AdminPage() {
  const session = useAdminSession();
  if (session.status === "signed-out") return <Navigate to="/admin/sign-in" replace />;
  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-6 pt-28 pb-12">
      <section className="max-w-6xl mx-auto space-y-6">
        <p className="text-padel-primary text-sm font-bold">CASUAL PADEL · ADMIN</p>
        <h1 className="text-3xl font-bold">
          {session.status === "allowed"
            ? "Platform overview"
            : session.status === "checking"
              ? "Checking admin access…"
              : "Admin access unavailable"}
        </h1>
        {session.status === "allowed" ? (
          <div className="rounded-2xl border border-padel-border bg-padel-surface p-6 space-y-3">
            <h2 className="text-xl font-semibold">Your admin workspace</h2>
            <p className="text-padel-muted">
              Account, tournament and activity reports will appear here as they become available.
            </p>
          </div>
        ) : null}
        {session.status === "denied" ? (
          <p className="text-padel-muted">This account does not have active platform admin access.</p>
        ) : null}
        {session.status === "error" ? (
          <>
            <p className="text-padel-muted">Could not check access. Please try again.</p>
            <button onClick={session.retry} className="min-h-12 rounded-xl border border-padel-border px-5">
              Check access again
            </button>
          </>
        ) : null}
        <div className="flex flex-wrap items-center gap-6">
          <Link to="/" className="underline text-padel-muted">
            Back to the viewer
          </Link>
          <button onClick={session.signOut} className="min-h-12 rounded-xl border border-padel-border px-5">
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}

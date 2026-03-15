import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-padel-background text-padel-text flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-padel-muted font-semibold">
          Casual Padel Tourneys
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">Page not found</h1>
        <p className="text-sm text-padel-muted">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 rounded-xl bg-padel-primary text-padel-background text-sm font-extrabold tracking-wide"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

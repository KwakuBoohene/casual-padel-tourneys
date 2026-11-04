import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { adminRequest } from "../../lib/admin/api";
import { takeAdminMagicToken } from "../../lib/admin/magicLink";
import { useAdminSession } from "./AdminSession";

export function AdminSignIn() {
  const session = useAdminSession();
  const { signIn } = session;
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    const token = takeAdminMagicToken();
    if (token) {
      setBusy(true);
      void adminRequest<{ token: string }>("/auth/magic-link/consume", {
        body: { token, clientSurface: "viewer-admin" }
      })
        .then((result) => {
          if (current !== generation.current) return;
          signIn(result.token);
          navigate("/admin", { replace: true });
        })
        .catch(() => {
          if (current === generation.current)
            setMessage("This link could not be used. Request a fresh sign-in link.");
        })
        .finally(() => {
          if (current === generation.current) setBusy(false);
        });
    }
    return () => {
      generation.current++;
    };
  }, [location.hash, navigate, signIn]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const current = ++generation.current;
    try {
      await adminRequest("/admin/sign-in", { body: { email: email.trim().toLowerCase() } });
      if (current === generation.current)
        setMessage("If this account has admin access, a sign-in link will arrive shortly.");
    } catch {
      if (current === generation.current) setMessage("Could not request a link. Please try again later.");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-6 pt-28 pb-12">
      <section className="max-w-md mx-auto space-y-6">
        <p className="text-padel-primary text-sm font-bold">CASUAL PADEL · ADMIN</p>
        <h1 className="text-3xl font-bold">Sign in to administration</h1>
        <p className="text-padel-muted">
          Use the email on your verified admin account. We’ll send you a sign-in link.
        </p>
        <form
          onSubmit={(event) => {
            void submit(event);
          }}
          className="space-y-4"
        >
          <label className="block space-y-2">
            <span>Email address</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
              className="block w-full min-h-12 rounded-xl border border-padel-border bg-padel-surface px-4"
            />
          </label>
          <button
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-padel-primary text-padel-onPrimary font-semibold disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Email me a sign-in link"}
          </button>
        </form>
        {message ? (
          <p role="status" className="text-padel-muted">
            {message}
          </p>
        ) : null}
        <Link to="/" className="inline-block text-padel-muted underline">
          Back to the viewer
        </Link>
      </section>
    </main>
  );
}

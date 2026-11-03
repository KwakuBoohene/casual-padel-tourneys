import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AdminAccessResponse } from "@padel/shared";
import { adminRequest, AdminRequestError } from "../../lib/admin/api";

type Status = "signed-out" | "checking" | "allowed" | "denied" | "error";
interface SessionContext {
  status: Status;
  actorUserId: string | null;
  signIn(token: string): void;
  signOut(): void;
  retry(): void;
}
const Context = createContext<SessionContext | null>(null);
const key = "padelViewerAdminToken";
function storedToken(): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function storeToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(key, token);
    else sessionStorage.removeItem(key);
  } catch {
    /* Memory-only session still works. */
  }
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(storedToken);
  const [status, setStatus] = useState<Status>(() => (token ? "checking" : "signed-out"));
  const [actorUserId, setActor] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const signOut = useCallback(() => {
    generation.current++;
    storeToken(null);
    setToken(null);
    setActor(null);
    setStatus("signed-out");
  }, []);
  const signIn = useCallback((candidate: string) => {
    generation.current++;
    storeToken(null);
    setActor(null);
    setStatus("checking");
    setToken(candidate);
    setAttempt((n) => n + 1);
  }, []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    let controller: AbortController | undefined;
    const check = async () => {
      const current = ++generation.current;
      controller?.abort();
      controller = new AbortController();
      setStatus("checking");
      setActor(null);
      try {
        const result = await adminRequest<AdminAccessResponse>("/admin/access", {
          token,
          signal: controller.signal
        });
        if (!active || current !== generation.current) return;
        if (result.data?.access !== "ADMIN" || !result.data.actorUserId) throw new AdminRequestError(403);
        storeToken(token);
        setActor(result.data.actorUserId);
        setStatus("allowed");
      } catch (error) {
        if (!active || current !== generation.current) return;
        setActor(null);
        if (error instanceof AdminRequestError && [401, 403].includes(error.status)) {
          storeToken(null);
          setToken(null);
          setStatus(error.status === 401 ? "signed-out" : "denied");
        } else setStatus("error");
      }
    };
    const refresh = () => {
      if (document.visibilityState !== "hidden") void check();
    };
    void check();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 60_000);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [token, attempt]);
  return (
    <Context.Provider value={{ status, actorUserId, signIn, signOut, retry: () => setAttempt((n) => n + 1) }}>
      {children}
    </Context.Provider>
  );
}

export function useAdminSession(): SessionContext {
  const session = useContext(Context);
  if (!session) throw new Error("Admin session provider missing.");
  return session;
}

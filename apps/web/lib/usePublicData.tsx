import { useEffect, useState } from "react";
import { publicApiBaseUrl } from "./apiConfig";

type DataState<T> = { path: string; data: T | null; loading: boolean; error: string | null };

/** Cancel obsolete requests so changing a share link or range cannot display stale data. */
export function usePublicData<T>(path: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DataState<T>>({ path, data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ path, data: null, loading: true, error: null });
    void (async () => {
      try {
        const response = await fetch(`${publicApiBaseUrl()}${path}`, {
          cache: "no-store",
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        if (response.status === 404 || response.status === 410) {
          setState({ path, data: null, loading: false, error: null });
          return;
        }
        if (!response.ok) throw new Error("Could not load the viewer. Please try again.");
        const payload = (await response.json()) as { data: T };
        if (!controller.signal.aborted) setState({ path, data: payload.data, loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted)
          setState({
            path,
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : "Could not load the viewer."
          });
      }
    })();
    return () => controller.abort();
  }, [path, attempt]);
  return {
    ...(state.path === path ? state : { path, data: null, loading: true, error: null }),
    retry: () => setAttempt((value) => value + 1)
  };
}

export function DataStatus({
  state
}: {
  state: { loading: boolean; error: string | null; retry: () => void };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-padel-background text-padel-text px-5">
      <div className="text-center space-y-4" role={state.error ? "alert" : "status"}>
        <p className={state.error ? "text-padel-danger" : "text-padel-muted"}>{state.error ?? "Loading…"}</p>
        {state.error ? (
          <button
            type="button"
            onClick={state.retry}
            className="min-h-12 rounded-xl border border-padel-border bg-padel-surface px-5 font-semibold"
          >
            Try again
          </button>
        ) : null}
      </div>
    </main>
  );
}

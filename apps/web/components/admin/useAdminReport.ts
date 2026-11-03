import { useEffect, useState } from "react";
import { AdminRequestError } from "../../lib/admin/api";
import { useAdminSession } from "./AdminSession";

export function useAdminReport<T>(path: string | null, revision: number) {
  const { request } = useAdminSession();
  const [state, setState] = useState<{ path: string; revision: number; data?: T; error?: number }>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    void request<T>(path, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ path, revision, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({ path, revision, error: error instanceof AdminRequestError ? error.status : 0 });
      }
    );
    return () => controller.abort();
  }, [path, revision, request]);
  return state?.path === path && state.revision === revision ? state : undefined;
}

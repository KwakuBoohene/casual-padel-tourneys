import { viewerFetch, viewerJson } from "../observability/sentry";
import { publicApiBaseUrl } from "../apiConfig";

export class AdminRequestError extends Error {
  constructor(readonly status: number) {
    super("Admin request failed.");
  }
}

/** Only explicitly private calls get a bearer token; public spectator requests stay anonymous. */
export async function adminRequest<T>(
  path: string,
  options: { token?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
  if (!(path.startsWith("/admin/") || path === "/auth/magic-link/consume"))
    throw new Error("Invalid admin endpoint.");
  const response = await viewerFetch(`${publicApiBaseUrl()}${path}`, {
    method: options.body === undefined ? "GET" : "POST",
    cache: "no-store",
    signal: options.signal,
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" })
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
  });
  if (!response.ok) throw new AdminRequestError(response.status);
  return await viewerJson<T>(response);
}

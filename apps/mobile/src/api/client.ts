import { logger } from "../logger";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  logger.debug("api/setAuthToken", { hasToken: Boolean(token) });
}

export async function apiGet<T>(path: string): Promise<T> {
  logger.debug("apiGet", { path });
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: authToken
      ? {
          Authorization: `Bearer ${authToken}`
        }
      : undefined
  });
  if (!response.ok) {
    logger.error("apiGet failed", { path, status: response.status });
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  logger.debug("apiPost", { path, hasPayload: payload != null });
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    logger.error("apiPost failed", { path, status: response.status });
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  logger.debug("apiDelete", { path });
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "DELETE",
    headers: authToken
      ? {
          Authorization: `Bearer ${authToken}`
        }
      : undefined
  });
  if (!response.ok) {
    logger.error("apiDelete failed", { path, status: response.status });
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

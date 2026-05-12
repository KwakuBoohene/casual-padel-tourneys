import { logger } from "../logger";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

let authToken: string | null = null;

async function parseApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    if (body?.message) {
      return body.message;
    }
  } catch {
    // Ignore parse failures and fall back to status text.
  }
  return response.statusText || `Request failed: ${response.status}`;
}

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
    const message = await parseApiError(response);
    logger.error("apiGet failed", { path, status: response.status, message });
    throw new Error(message);
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
    const message = await parseApiError(response);
    logger.error("apiPost failed", { path, status: response.status, message });
    throw new Error(message);
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
    const message = await parseApiError(response);
    logger.error("apiDelete failed", { path, status: response.status, message });
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

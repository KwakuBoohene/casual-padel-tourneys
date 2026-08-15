import { ApiError } from "./errors";
import { logger } from "../logger";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

let authToken: string | null = null;

async function parseApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      message?: string;
      code?: string;
      verifyBy?: number;
    };
    return new ApiError({
      message: body?.message || response.statusText || `Request failed: ${response.status}`,
      status: response.status,
      code: body?.code,
      verifyBy: body?.verifyBy
    });
  } catch {
    return new ApiError({
      message: response.statusText || `Request failed: ${response.status}`,
      status: response.status
    });
  }
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
    const error = await parseApiError(response);
    logger.error("apiGet failed", { path, status: error.status, message: error.message, code: error.code });
    throw error;
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
    const error = await parseApiError(response);
    logger.error("apiPost failed", { path, status: error.status, message: error.message, code: error.code });
    throw error;
  }
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, payload: unknown): Promise<T> {
  logger.debug("apiPut", { path, hasPayload: payload != null });
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await parseApiError(response);
    logger.error("apiPut failed", { path, status: error.status, message: error.message, code: error.code });
    throw error;
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
    const error = await parseApiError(response);
    logger.error("apiDelete failed", {
      path,
      status: error.status,
      message: error.message,
      code: error.code
    });
    throw error;
  }
  return response.json() as Promise<T>;
}

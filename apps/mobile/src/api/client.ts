import { ApiError } from "./errors";
import { notifyAuthFailure } from "./sessionExpiry";
import {
  captureOrganizerContext,
  notifyOrganizerAccessLost,
  notifyOrganizerConflict,
  rememberTournamentVersion,
  setOrganizerIdentity,
  trackOrganizerRequest,
  withKnownTournamentVersion
} from "./organizerContext";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  if (authToken !== token) setOrganizerIdentity("");
  authToken = token;
}
export function getAuthToken(): string | null {
  return authToken;
}
export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

async function request<T>(path: string, method: string, payload?: unknown): Promise<T> {
  const context = captureOrganizerContext();
  const token = authToken;
  const personal =
    /^\/auth\//.test(path) || path === "/organizers" || path.startsWith("/organizer-invitations/");
  const resolvedPath = personal ? path : context.path(path);
  const controller = new AbortController();
  const finish = personal ? () => {} : trackOrganizerRequest(controller, method !== "GET");
  try {
    const response = await fetch(`${apiBaseUrl}${resolvedPath}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(payload !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!personal ? context.headers : {})
      },
      ...(payload !== undefined ? { body: JSON.stringify(withKnownTournamentVersion(path, payload)) } : {})
    });
    if (!personal) context.assertCurrent();
    if (!response.ok) {
      let body: { message?: string; code?: string; verifyBy?: number } = {};
      try {
        body = await response.json();
      } catch {
        /* fall back to HTTP status */
      }
      const error = new ApiError({
        message: body.message ?? response.statusText,
        code: body.code,
        verifyBy: body.verifyBy,
        status: response.status
      });
      notifyAuthFailure(path, response.status, Boolean(token));
      if (body.code === "ORGANIZER_ACCESS_REVOKED") notifyOrganizerAccessLost();
      if (response.status === 409) notifyOrganizerConflict();
      throw error;
    }
    const data = (await response.json()) as T;
    if (!personal) context.assertCurrent();
    rememberTournamentVersion((data as { data?: unknown }).data);
    return data;
  } finally {
    finish();
  }
}
export const apiGet = <T>(path: string) => request<T>(path, "GET");
export const apiPost = <T>(path: string, payload: unknown) => request<T>(path, "POST", payload);
export const apiPut = <T>(path: string, payload: unknown) => request<T>(path, "PUT", payload);
export const apiDelete = <T>(path: string) => request<T>(path, "DELETE");

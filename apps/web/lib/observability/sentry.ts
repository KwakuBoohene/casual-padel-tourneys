import * as Sentry from "@sentry/browser";
import { sampleRate, sanitizeViewerError, sanitizeViewerTrace } from "./privacy";

export interface ViewerMonitoringConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: string;
}

type FailureReason = "render" | "network" | "http" | "invalid-data" | "connection" | "bootstrap";
const lastReported = new Map<FailureReason, number>();

export function initViewerMonitoring(config?: ViewerMonitoringConfig): void {
  if (!config?.dsn || Sentry.isInitialized()) return;
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment ?? "production",
    release: config.release,
    defaultIntegrations: false,
    integrations: [Sentry.globalHandlersIntegration(), Sentry.dedupeIntegration()],
    traceLifecycle: "static",
    tracesSampleRate: sampleRate(config.tracesSampleRate),
    beforeSend: sanitizeViewerError,
    beforeSendTransaction: sanitizeViewerTrace
  });
}

export function captureViewerError(error: unknown, reason: FailureReason): void {
  if (!Sentry.isInitialized()) return;
  const now = Date.now();
  // Polling/reconnection failures must not create an event on every attempt.
  if (reason !== "render" && now - (lastReported.get(reason) ?? -Infinity) < 60_000) return;
  lastReported.set(reason, now);
  Sentry.captureException(error, { tags: { reason } });
}

export async function viewerFetch(url: string, init: RequestInit): Promise<Response> {
  const fetchResponse = async (span?: Sentry.Span): Promise<Response> => {
    try {
      const response = await fetch(url, init);
      if (span) Sentry.setHttpStatus(span, response.status);
      if (response.status >= 500) captureViewerError(new Error("Viewer service unavailable"), "http");
      return response;
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        span?.setStatus({ code: 2, message: "unavailable" });
        captureViewerError(error, "network");
      }
      throw error;
    }
  };
  if (!Sentry.isInitialized()) return fetchResponse();
  return Sentry.startSpan({ name: "API request", op: "http.client", forceTransaction: true }, fetchResponse);
}

export async function viewerJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    captureViewerError(error, "invalid-data");
    throw error;
  }
}

/** Report a sustained unexpected close once, without ever inspecting the socket URL or payload. */
export function watchViewerConnection(socket: WebSocket, delayMs = 30_000): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const closed = (event: CloseEvent) => {
    if ([1000, 1001, 4401, 4404].includes(event.code) || timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      captureViewerError(new Error("Viewer live connection unavailable"), "connection");
    }, delayMs);
  };
  socket.addEventListener("close", closed);
  socket.addEventListener("open", cancel);
  return () => {
    cancel();
    socket.removeEventListener("close", closed);
    socket.removeEventListener("open", cancel);
  };
}

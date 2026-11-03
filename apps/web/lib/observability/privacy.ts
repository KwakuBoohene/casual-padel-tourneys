import type { ErrorEvent, Event, EventHint } from "@sentry/browser";

function safeFilename(value: string | undefined): string | undefined {
  const path = value?.split(/[?#]/)[0];
  // Page URLs can contain share tokens, even tokens ending in .js. Keep only built asset locations.
  return path?.match(/\/assets\/([a-zA-Z0-9_.-]+\.[cm]?js)$/)?.[1];
}

export function sampleRate(value: string | undefined): number {
  if (!value?.trim()) return 0.1;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0;
}

/** Construct diagnostics from an allowlist; never forward page URLs, identities or arbitrary text. */
export function sanitizeViewerError(event: ErrorEvent, hint?: EventHint): ErrorEvent | null {
  const error = hint?.originalException;
  if (error instanceof Error && (error.name === "AbortError" || error.name === "ApiError")) return null;
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: "javascript",
    level: event.level,
    release: event.release,
    environment: event.environment,
    tags: {
      source: "public-viewer",
      ...(typeof event.tags?.reason === "string" &&
      ["render", "network", "http", "invalid-data", "connection", "bootstrap"].includes(event.tags.reason)
        ? { reason: event.tags.reason }
        : {})
    },
    contexts: event.contexts?.trace
      ? {
          trace: {
            trace_id: event.contexts.trace.trace_id,
            span_id: event.contexts.trace.span_id
          }
        }
      : undefined,
    exception: {
      values: event.exception?.values?.map((exception) => ({
        type: ["TypeError", "RangeError", "ReferenceError", "SyntaxError"].includes(exception.type ?? "")
          ? exception.type
          : "Error",
        value: "Unexpected viewer failure",
        mechanism: exception.mechanism
          ? { type: "generic", handled: exception.mechanism.handled }
          : undefined,
        stacktrace: {
          frames: exception.stacktrace?.frames?.map((frame) => ({
            filename: safeFilename(frame.filename),
            lineno: frame.lineno,
            colno: frame.colno,
            in_app: frame.in_app
          }))
        }
      }))
    }
  };
}

/** Only our explicit fetch spans are sent; no browser URLs, DOM details or request payloads. */
export function sanitizeViewerTrace(event: Event): Event & { type: "transaction" } {
  return {
    type: "transaction",
    event_id: event.event_id,
    timestamp: event.timestamp,
    start_timestamp: event.start_timestamp,
    platform: "javascript",
    transaction: "API request",
    release: event.release,
    environment: event.environment,
    tags: { source: "public-viewer" },
    spans: [],
    contexts: event.contexts?.trace
      ? {
          trace: {
            trace_id: event.contexts.trace.trace_id,
            span_id: event.contexts.trace.span_id,
            op: "http.client",
            status: event.contexts.trace.status
          }
        }
      : undefined
  };
}

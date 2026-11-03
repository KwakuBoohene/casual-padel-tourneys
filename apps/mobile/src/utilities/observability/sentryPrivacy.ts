import type { ErrorEvent, Event, EventHint } from "@sentry/browser";

function safeFilename(value: string | undefined): string | undefined {
  const name = value?.split(/[?#]/)[0]?.split("/").pop();
  return name && /^[a-zA-Z0-9_.-]+\.[cm]?[jt]sx?$/.test(name) ? name : undefined;
}

export function sampleRate(value: string | undefined): number {
  if (!value?.trim()) return 0.1;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0;
}

/** Expected HTTP failures are handled by the UI; API 5xx failures are captured by the server. */
export function sanitizeBrowserError(event: ErrorEvent, hint?: EventHint): ErrorEvent | null {
  const error = hint?.originalException;
  if (error instanceof Error && (error.name === "AbortError" || error.name === "ApiError")) return null;
  return {
    type: undefined, event_id: event.event_id, timestamp: event.timestamp,
    platform: "javascript", level: event.level, release: event.release, environment: event.environment,
    tags: { source: "cpa-web" },
    contexts: event.contexts?.trace ? { trace: {
      trace_id: event.contexts.trace.trace_id, span_id: event.contexts.trace.span_id
    } } : undefined,
    exception: { values: event.exception?.values?.map((exception) => ({
      type: ["TypeError", "RangeError", "ReferenceError", "SyntaxError"].includes(exception.type ?? "")
        ? exception.type : "Error",
      value: "Unexpected CPA web failure",
      mechanism: exception.mechanism ? { type: "generic", handled: exception.mechanism.handled } : undefined,
      stacktrace: { frames: exception.stacktrace?.frames?.map((frame) => ({
        filename: safeFilename(frame.filename), lineno: frame.lineno, colno: frame.colno, in_app: frame.in_app
      })) }
    })) }
  };
}

/** Only our explicit fetch spans are sent; no browser URLs, DOM details or request payloads. */
export function sanitizeBrowserTrace(event: Event): Event & { type: "transaction" } {
  return {
    type: "transaction", event_id: event.event_id, timestamp: event.timestamp,
    start_timestamp: event.start_timestamp, platform: "javascript",
    transaction: "API request", release: event.release, environment: event.environment,
    tags: { source: "cpa-web" }, spans: [],
    contexts: event.contexts?.trace ? { trace: {
      trace_id: event.contexts.trace.trace_id, span_id: event.contexts.trace.span_id,
      op: "http.client", status: event.contexts.trace.status
    } } : undefined
  };
}

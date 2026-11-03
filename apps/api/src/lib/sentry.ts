import { createHmac } from "node:crypto";
import * as Sentry from "@sentry/node";

/** Keep diagnostics useful by source location without exporting arbitrary application data. */
export function sanitizeEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  return {
    type: undefined,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: "node",
    level: event.level,
    environment: event.environment,
    release: event.release,
    tags: {
      source: "api",
      ...(typeof event.tags?.request_id === "string" && /^[a-f0-9]{64}$/.test(event.tags.request_id)
        ? { request_id: event.tags.request_id } : {})
    },
    user: typeof event.user?.id === "string" && /^[a-f0-9]{64}$/.test(event.user.id) ? { id: event.user.id } : undefined,
    contexts: { trace: event.contexts?.trace ? {
      trace_id: event.contexts.trace.trace_id, span_id: event.contexts.trace.span_id
    } : undefined },
    exception: {
      values: event.exception?.values?.map((exception) => ({
        type: "Error",
        mechanism: exception.mechanism ? { type: "generic", handled: exception.mechanism.handled } : undefined,
        value: "Unexpected API failure",
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

function safeFilename(value: string | undefined): string | undefined {
  const file = value?.split(/[?#]/)[0]?.split("/").pop();
  return file && /^[a-zA-Z0-9_.-]+\.[cm]?[jt]s$/.test(file) ? file : undefined;
}

export function traceRate(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return 0.1;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0;
}

export function initSentry(): void {
  if (!process.env.SENTRY_DSN || Sentry.isInitialized()) return;
  Sentry.init({
    traceLifecycle: "static",
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE,
    integrations: [Sentry.onUncaughtExceptionIntegration(), Sentry.onUnhandledRejectionIntegration()],
    defaultIntegrations: false,
    tracesSampleRate: traceRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
    beforeSend: sanitizeEvent,
    beforeSendTransaction: (event) => ({
      ...event, request: undefined, user: undefined, extra: undefined, breadcrumbs: undefined,
      contexts: { trace: event.contexts?.trace }, spans: [], tags: { source: "api" }
    })
  });
}

export function diagnosticId(value: string): string | undefined {
  const secret = process.env.JWT_SECRET;
  return secret ? createHmac("sha256", secret).update(value).digest("hex") : undefined;
}

export function reportApiError(error: unknown, context: { id: string; user?: { id: string } }): void {
  if (!Sentry.isInitialized()) return;
  Sentry.withScope((scope) => {
    const requestId = diagnosticId(context.id);
    if (requestId) scope.setTag("request_id", requestId);
    const userId = context.user && diagnosticId(context.user.id);
    if (userId) scope.setUser({ id: userId });
    Sentry.captureException(error);
  });
}

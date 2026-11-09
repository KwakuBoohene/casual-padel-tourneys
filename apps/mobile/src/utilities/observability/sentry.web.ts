import * as Sentry from "@sentry/browser";
import { sampleRate, sanitizeBrowserError, sanitizeBrowserTrace } from "./sentryPrivacy";

export function initSentry(): void {
  // Expo exports can evaluate modules without a browser. Public env values are inlined at build time.
  if (typeof window === "undefined" || !process.env.EXPO_PUBLIC_SENTRY_DSN || Sentry.isInitialized()) return;
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? "development",
    release: process.env.EXPO_PUBLIC_SENTRY_RELEASE,
    defaultIntegrations: false,
    integrations: [Sentry.globalHandlersIntegration(), Sentry.dedupeIntegration()],
    traceLifecycle: "static",
    tracesSampleRate: sampleRate(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE),
    beforeSend: sanitizeBrowserError,
    beforeSendTransaction: sanitizeBrowserTrace
  });
}

export function captureClientError(error: unknown): void {
  if (Sentry.isInitialized()) Sentry.captureException(error);
}

export async function monitoredFetch(url: string, init: RequestInit): Promise<Response> {
  if (!Sentry.isInitialized()) return fetch(url, init);
  return Sentry.startSpan({ name: "API request", op: "http.client", forceTransaction: true }, async (span) => {
    try {
      const response = await fetch(url, init);
      Sentry.setHttpStatus(span, response.status);
      return response;
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        span.setStatus({ code: 2, message: "unavailable" });
        captureClientError(error);
      }
      throw error;
    }
  });
}

import type { FastifyInstance, FastifyRequest } from "fastify";
import * as Sentry from "@sentry/node";
import { reportApiError } from "../../lib/sentry.js";

const spans = new WeakMap<FastifyRequest, Sentry.Span>();
const reported = new WeakSet<FastifyRequest>();

export function reportRequestError(request: FastifyRequest, error: unknown): void {
  if (reported.has(request)) return;
  reported.add(request);
  Sentry.withActiveSpan(spans.get(request) ?? null, () => reportApiError(error, request));
}

/** Explicit request spans avoid automatic collection of SQL, bodies, and capability URLs. */
export function registerSentryMonitoring(server: FastifyInstance): void {
  server.addHook("onRequest", async (request) => {
    if (!Sentry.isInitialized() || ["/health", "/ready"].includes(request.routeOptions.url ?? "")) return;
    spans.set(request, Sentry.startInactiveSpan({
      name: `${request.method} ${request.routeOptions.url ?? "unmatched"}`,
      op: "http.server", forceTransaction: true
    }));
  });
  server.addHook("onError", async (request, reply, error) => {
    const status = (error as { statusCode?: number; httpStatus?: number }).httpStatus
      ?? error.statusCode ?? (reply.statusCode >= 400 ? reply.statusCode : 500);
    if (status >= 500) reportRequestError(request, error);
  });
  server.addHook("onSend", async (request, reply, payload) => {
    if (reply.statusCode >= 500) reportRequestError(request, new Error("Unexpected API response"));
    return payload;
  });
  server.addHook("onResponse", async (request, reply) => {
    const span = spans.get(request);
    if (span) {
      Sentry.setHttpStatus(span, reply.statusCode);
      span.end();
      spans.delete(request);
    }
  });
  server.addHook("onClose", async () => { await Sentry.flush(2000); });
}

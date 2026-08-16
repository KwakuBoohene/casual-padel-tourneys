import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";

/** Callers may supply their own correlation id; Fastify falls back to a generated one. */
export const REQUEST_ID_HEADER = "x-request-id";

const MAX_INCOMING_REQUEST_ID = 128;

/** Share/reset tokens travel in the URL, so they must never reach the log stream. */
const TOKEN_QUERY_KEYS = new Set(["token", "publicToken", "public_token", "access_token"]);

export function generateRequestId(): string {
  return randomUUID();
}

export function redactUrl(url: string): string {
  const [rawPath, ...rest] = url.split("?");
  const path = rawPath.replace(/^\/public\/[^/]+/, "/public/[redacted]");
  const rawQuery = rest.join("?");
  if (!rawQuery) {
    return path;
  }
  const query = rawQuery
    .split("&")
    .map((pair) => {
      const key = pair.split("=")[0];
      return TOKEN_QUERY_KEYS.has(key) ? `${key}=[redacted]` : pair;
    })
    .join("&");
  return `${path}?${query}`;
}

/**
 * Request log fields. Deliberately excludes headers and cookies so JWTs and organizer
 * tokens cannot leak into logs.
 */
export function serializeRequest(request: {
  id?: string;
  method: string;
  url: string;
  ip?: string;
}): Record<string, unknown> {
  return {
    id: request.id,
    method: request.method,
    url: redactUrl(request.url),
    remoteAddress: request.ip
  };
}

/** Echo the correlation id so clients and proxies can stitch a request to its logs. */
export function registerRequestId(server: FastifyInstance): void {
  server.addHook("onRequest", async (request, reply) => {
    reply.header(REQUEST_ID_HEADER, request.id);
  });
}

export function normalizeIncomingRequestId(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return generateRequestId();
  }
  return value.trim().slice(0, MAX_INCOMING_REQUEST_ID);
}

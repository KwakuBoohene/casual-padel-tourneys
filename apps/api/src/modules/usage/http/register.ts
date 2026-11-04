import type { FastifyInstance } from "fastify";
import { usageBatchSchema } from "@padel/shared";
import { randomUUID } from "node:crypto";
import { verifyAuthToken } from "../../auth/infrastructure/JwtAuthTokens.js";
import { prisma } from "../../../lib/prisma.js";
import { usageEnabled } from "../domain/policy.js";
import { recordUsageEvent, recordLogin } from "../infrastructure/recordEvent.js";

export function registerUsageModule(server: FastifyInstance): void {
  server.post(
    "/usage/visits",
    { bodyLimit: 8192, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      if (!usageEnabled("visits")) return reply.code(202).send({ accepted: true });
      const parsed = usageBatchSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ message: "Invalid visit batch." });
      const batch = parsed.data;
      const now = new Date();
      if (batch.events.some((event) => Math.abs(now.getTime() - Date.parse(event.occurredAt)) > 10 * 60_000))
        return reply.code(400).send({ message: "Visit batch expired." });
      let actorUserId: string | null = null;
      if (batch.surface === "organizer") {
        const header = request.headers.authorization;
        const user = header?.startsWith("Bearer ") ? verifyAuthToken(header.slice(7)) : null;
        if (!user || !(await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } })))
          return reply.code(401).send({ message: "Sign in required." });
        actorUserId = user.id;
      }
      await prisma.$transaction(async (tx) => {
        for (const event of batch.events)
          await recordUsageEvent(tx, {
            id: `visit:${event.id}`,
            kind: "visit",
            surface: batch.surface,
            route: event.route,
            sessionId: event.sessionId,
            actorUserId,
            occurredAt: now
          });
      });
      return reply.code(202).send({ accepted: true });
    }
  );
  server.addHook("onSend", async (request, reply, payload) => {
    if (
      (request.routeOptions.url === "/auth/magic-link/consume" &&
        (request.body as { clientSurface?: string } | null)?.clientSurface === "viewer-admin") ||
      !usageEnabled("business") ||
      reply.statusCode >= 300 ||
      !/^\/auth\/(google|guest|magic-link\/consume|password\/(login|register)\/finish)$/.test(
        request.routeOptions.url ?? ""
      )
    )
      return payload;
    try {
      const body =
        typeof payload === "string"
          ? (JSON.parse(payload) as { token?: string; user?: { id?: string } })
          : null;
      if (body?.token && body.user?.id) await recordLogin(body.user.id, randomUUID());
    } catch {
      request.log.warn("Login observation could not be recorded.");
    }
    return payload;
  });
}

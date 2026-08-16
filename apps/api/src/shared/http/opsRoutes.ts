import type { FastifyInstance } from "fastify";

import { prisma } from "../../lib/prisma.js";

/**
 * Process-level ops endpoints. They belong to no bounded context, so they are registered
 * once from `app.ts` instead of living inside a feature module.
 *
 * - `/health` is liveness only: it answers as long as the event loop is running, so a
 *   supervisor never restarts the API just because Postgres is briefly unreachable.
 * - `/ready` fails closed (503) when the database is unreachable, so a load balancer can
 *   drain the instance.
 */
export function registerOpsRoutes(server: FastifyInstance): void {
  // `status` is kept for existing probes; `ok` matches the documented shape.
  server.get("/health", { config: { rateLimit: false } }, async () => ({
    status: "ok",
    ok: true
  }));

  server.get("/ready", { config: { rateLimit: false } }, async (request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: "ok", ok: true, checks: { database: "up" } };
    } catch (error) {
      request.log.error(
        { reason: error instanceof Error ? error.name : "unknown" },
        "readiness check failed: database unreachable"
      );
      reply.status(503);
      return { status: "unavailable", ok: false, checks: { database: "down" } };
    }
  });
}

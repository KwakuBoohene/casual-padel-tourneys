import type { FastifyInstance } from "fastify";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import type { KohModuleDeps } from "../application/ports.js";
import { getKohHub, getKohRankings } from "../application/readKohHub.js";
import { parseOptionalCourtNumber } from "./kohParams.js";
import { mapKohError } from "./mapKohError.js";

export function registerKohQueryRoutes(server: FastifyInstance, deps: KohModuleDeps): void {
  server.get("/koh/tournaments/:id", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const params = request.params as { id: string };
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }
    try {
      const data = await getKohHub(deps, {
        tournamentId: params.id,
        organizerId: request.user.id
      });
      request.log.info({ id: params.id }, "GET /koh/tournaments/:id");
      return { data };
    } catch (error) {
      return mapKohError(reply, error, "Tournament not found.");
    }
  });

  server.get(
    "/koh/tournaments/:id/rankings",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string };
      const query = request.query as { courtNumber?: string };
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      const court = parseOptionalCourtNumber(query.courtNumber);
      if (!court.ok) {
        reply.status(400);
        return { message: court.message };
      }
      try {
        const data = await getKohRankings(deps, {
          tournamentId: params.id,
          organizerId: request.user.id,
          courtNumber: court.courtNumber
        });
        request.log.info(
          { id: params.id, courtNumber: court.courtNumber ?? null },
          "GET .../rankings"
        );
        return { data };
      } catch (error) {
        return mapKohError(reply, error, "Rankings failed.");
      }
    }
  );
}

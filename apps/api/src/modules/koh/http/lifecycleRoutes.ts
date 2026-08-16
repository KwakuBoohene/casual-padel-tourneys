import type { FastifyInstance } from "fastify";
import { endKohTournamentSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { endKohTournament } from "../application/endKohTournament.js";
import type { KohModuleDeps } from "../application/ports.js";
import { mapKohError } from "./mapKohError.js";

export function registerKohLifecycleRoutes(server: FastifyInstance, deps: KohModuleDeps): void {
  server.post("/koh/tournaments/:id/end", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = endKohTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }
    try {
      const data = await endKohTournament(deps, {
        tournamentId: params.id,
        organizerId: request.user.id,
        expectedVersion: parsed.data.expectedVersion
      });
      request.log.info({ id: params.id }, "POST .../end");
      return { data };
    } catch (error) {
      return mapKohError(reply, error, "End tournament failed.");
    }
  });
}

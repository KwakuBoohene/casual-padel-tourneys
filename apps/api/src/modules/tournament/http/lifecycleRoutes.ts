import type { FastifyInstance } from "fastify";
import {
  advanceMexicanoRoundSchema,
  endMexicanoNightSchema
} from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import {
  advanceMexicanoRound,
  deleteTournament,
  endMexicanoNight
} from "../application/liveMutations.js";
import type { TournamentModuleDeps } from "../application/ports.js";

export function registerTournamentLifecycleRoutes(
  server: FastifyInstance,
  deps: TournamentModuleDeps
): void {
  server.post("/tournaments/next-round", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = advanceMexicanoRoundSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const tournament = await advanceMexicanoRound(deps, {
        tournamentId: parsed.data.tournamentId,
        organizerId: request.user!.id,
        expectedVersion: parsed.data.expectedVersion
      });
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });

  server.post("/tournaments/end-night", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = endMexicanoNightSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const tournament = await endMexicanoNight(deps, {
        tournamentId: parsed.data.tournamentId,
        organizerId: request.user!.id,
        expectedVersion: parsed.data.expectedVersion
      });
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });

  server.delete("/tournaments/:id", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const params = request.params as { id: string };
    try {
      await deleteTournament(deps, {
        tournamentId: params.id,
        organizerId: request.user!.id
      });
      return { ok: true };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });
}

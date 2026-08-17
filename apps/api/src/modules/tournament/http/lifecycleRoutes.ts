import type { FastifyInstance } from "fastify";
import {
  advanceMexicanoRoundSchema,
  deleteTournamentQuerySchema,
  endMexicanoNightSchema,
  isKingOfTheCourtMode
} from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { logger } from "../../../lib/logger.js";
import { prisma } from "../../../lib/prisma.js";
import { notFound } from "../../../shared/kernel/appError.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { deleteKohTournament } from "../../koh/infrastructure/ops/deleteKohOps.js";
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
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      const meta = await prisma.tournament.findUnique({
        where: { id: params.id },
        select: { mode: true, organizerId: true }
      });
      logger.debug("DELETE /tournaments/:id", {
        id: params.id,
        mode: meta?.mode,
        organizerMatch: meta?.organizerId === request.user.id
      });
      if (!meta || meta.organizerId !== request.user.id) {
        throw notFound("Tournament not found.");
      }
      const query = deleteTournamentQuerySchema.safeParse(request.query ?? {});
      if (!query.success) {
        reply.status(400);
        return { message: "removeFromCareerLeaderboard must be true or false." };
      }
      const stripCareer = query.data.removeFromCareerLeaderboard;
      if (isKingOfTheCourtMode(meta.mode)) {
        await deleteKohTournament(params.id, request.user.id, { stripCareer });
        await deps.events.publish({
          type: "TOURNAMENT_DELETED",
          tournamentId: params.id,
          payload: { id: params.id }
        });
        return { ok: true };
      }
      await deleteTournament(deps, {
        tournamentId: params.id,
        organizerId: request.user.id,
        stripCareer
      });
      return { ok: true };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });
}

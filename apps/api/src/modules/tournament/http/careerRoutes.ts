import type { FastifyInstance } from "fastify";
import { isKingOfTheCourtMode, setCareerLeaderboardSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { getKohHub } from "../../koh/application/readKohHub.js";
import { PrismaKohRepository } from "../../koh/infrastructure/PrismaKohRepository.js";
import { setCareerContribution } from "../../organizerPlayers/infrastructure/setCareerContribution.js";
import type { TournamentModuleDeps } from "../application/ports.js";

export function registerTournamentCareerRoutes(
  server: FastifyInstance,
  deps: TournamentModuleDeps
): void {
  const koh = { repo: new PrismaKohRepository() };

  server.post(
    "/tournaments/career-leaderboard",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const parsed = setCareerLeaderboardSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        const result = await setCareerContribution({
          tournamentId: parsed.data.tournamentId,
          organizerId: request.user.id,
          contributeToCareerLeaderboard: parsed.data.contributeToCareerLeaderboard
        });
        if (isKingOfTheCourtMode(result.mode)) {
          const data = await getKohHub(koh, {
            tournamentId: parsed.data.tournamentId,
            organizerId: request.user.id
          });
          await deps.events.publish({
            type: "KOH_HUB_UPDATED",
            tournamentId: data.id,
            payload: data
          });
          return { data };
        }
        const data = await deps.repo.getById(parsed.data.tournamentId);
        if (!data) {
          reply.status(404);
          return { message: "Tournament not found." };
        }
        await deps.events.publish({
          type: "TOURNAMENT_RENAMED",
          tournamentId: data.id,
          payload: data
        });
        return { data };
      } catch (error) {
        return mapAppError(reply, error);
      }
    }
  );
}

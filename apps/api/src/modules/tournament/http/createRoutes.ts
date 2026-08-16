import type { FastifyInstance } from "fastify";
import { createTournamentSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { handleCreateKohTournament } from "../../koh/http/createKoh.js";
import { createTournament } from "../application/createTournament.js";
import type { TournamentModuleDeps } from "../application/ports.js";
import { ensureOrganizerUser } from "../infrastructure/ensureOrganizerUser.js";

export function registerTournamentCreateRoutes(
  server: FastifyInstance,
  deps: TournamentModuleDeps
): void {
  server.post("/tournaments", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }

    const body = request.body as { mode?: string } | undefined;
    if (body?.mode === "KING_OF_THE_HILL") {
      const result = await handleCreateKohTournament(server, request.body, request.user.id);
      reply.status(result.status);
      return result.payload;
    }

    const parsed = createTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    const data = parsed.data;
    const playersFromTeams =
      data.variant === "TEAM" && data.teams && data.teams.length > 0
        ? data.teams.flatMap((team) => [team.playerA, team.playerB])
        : data.players;

    try {
      await ensureOrganizerUser({
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
        isGuest: request.user.isGuest
      });
      const tournament = await createTournament(deps, {
        organizerId: request.user.id,
        config: {
          ...data,
          players: playersFromTeams,
          teams: data.variant === "TEAM" ? data.teams : undefined,
          scoringMode: data.scoringMode,
          regularScoring: data.regularScoring,
          pointsPerMatch: data.pointsPerMatch ?? 24,
          contributeToCareerLeaderboard: data.contributeToCareerLeaderboard
        }
      });
      request.log.info({ id: tournament.id }, "POST /tournaments created");
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });
}

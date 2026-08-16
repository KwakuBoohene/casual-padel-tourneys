import type { FastifyInstance } from "fastify";
import { isRegularScoreBody, submitScoreSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import type { TournamentModuleDeps } from "../application/ports.js";
import { submitPointsScore, submitRegularScore } from "../application/submitScore.js";

export function registerTournamentScoreRoutes(
  server: FastifyInstance,
  deps: TournamentModuleDeps
): void {
  server.post("/tournaments/score", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = submitScoreSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }

    try {
      const body = parsed.data;
      const current = await deps.repo.getById(body.tournamentId);
      const scoringMode = current?.config.scoringMode ?? "AMERICANO_POINTS";

      let tournament;
      if (isRegularScoreBody(body)) {
        if (scoringMode !== "REGULAR") {
          reply.status(400);
          return { message: "Sets body requires a Regular scoring tournament." };
        }
        tournament = await submitRegularScore(deps, {
          tournamentId: body.tournamentId,
          organizerId: request.user.id,
          expectedVersion: body.expectedVersion,
          matchId: body.matchId,
          sets: body.sets,
          complete: body.status === "COMPLETE",
          matchTbA: body.matchTbA,
          matchTbB: body.matchTbB
        });
      } else {
        if (scoringMode === "REGULAR") {
          reply.status(400);
          return { message: "Points body is not allowed on a Regular scoring tournament." };
        }
        tournament = await submitPointsScore(deps, {
          tournamentId: body.tournamentId,
          organizerId: request.user.id,
          expectedVersion: body.expectedVersion,
          matchId: body.matchId,
          scoreA: body.scoreA,
          scoreB: body.scoreB
        });
      }

      request.log.info(
        {
          tournamentId: tournament.id,
          matchId: body.matchId,
          scoringMode: tournament.config.scoringMode ?? "AMERICANO_POINTS"
        },
        "POST /tournaments/score"
      );
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });
}

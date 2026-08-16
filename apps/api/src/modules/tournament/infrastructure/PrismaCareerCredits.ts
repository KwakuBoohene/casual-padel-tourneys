import { prisma } from "../../../lib/prisma.js";
import { creditMatchToOrganizerPlayers } from "../../organizerPlayers/infrastructure/careerCredits.js";
import type { CareerCreditRequest, CareerCredits } from "../application/ports.js";

/**
 * Americano/Mexicano credit runs in its own transaction after the aggregate is saved, because the
 * tournament repository owns the score write. Crediting is idempotent per
 * (matchId, organizerPlayerId), so a retried or corrected score overwrites instead of doubling.
 */
export class PrismaCareerCredits implements CareerCredits {
  async creditCompletedMatch(request: CareerCreditRequest): Promise<void> {
    await prisma.$transaction((tx) =>
      creditMatchToOrganizerPlayers({
        tx,
        organizerId: request.organizerId,
        tournamentId: request.tournamentId,
        tournamentName: request.tournamentName,
        tournamentMode: request.tournamentMode,
        matchId: request.matchId,
        sideAPlayerIds: request.teamAPlayerIds,
        sideBPlayerIds: request.teamBPlayerIds,
        winnerSide: request.winnerSide,
        gamesA: request.gamesA,
        gamesB: request.gamesB
      })
    );
  }
}

import { isKingOfTheCourtMode } from "@padel/shared";

import { prisma } from "../../../lib/prisma.js";
import { notFound } from "../../../shared/kernel/appError.js";
import { PrismaTournamentRepository } from "../../tournament/infrastructure/PrismaTournamentRepository.js";

import { creditKohMatchToOrganizerPlayers } from "./careerCredits.js";
import { creditAllCompletedAmericanoMatches } from "./creditAmericanoMatch.js";

async function backfillKohMatches(input: {
  tournamentId: string;
  tournamentName: string;
  organizerId: string;
  mode: "KING_OF_THE_COURT";
}): Promise<void> {
  const matches = await prisma.kohMatch.findMany({
    where: { completed: true, court: { tournamentId: input.tournamentId } },
    include: { sets: true, unitA: true, unitB: true }
  });
  for (const match of matches) {
    if (!match.winnerUnitId) continue;
    const gamesA = match.sets.reduce((sum, set) => sum + set.gamesA, 0);
    const gamesB = match.sets.reduce((sum, set) => sum + set.gamesB, 0);
    await prisma.$transaction(async (tx) => {
      await creditKohMatchToOrganizerPlayers({
        tx,
        organizerId: input.organizerId,
        tournamentId: input.tournamentId,
        tournamentName: input.tournamentName,
        matchId: match.id,
        unitAPlayerIds: [match.unitA.playerAId, match.unitA.playerBId],
        unitBPlayerIds: [match.unitB.playerAId, match.unitB.playerBId],
        winnerSide: match.winnerUnitId === match.unitAId ? "A" : "B",
        gamesA,
        gamesB,
        tournamentMode: input.mode
      });
    });
  }
}

/** Flip the career-board flag and add or remove this event's deltas. */
export async function setCareerContribution(input: {
  tournamentId: string;
  organizerId: string;
  contributeToCareerLeaderboard: boolean;
}): Promise<{ mode: string }> {
  const row = await prisma.tournament.findUnique({
    where: { id: input.tournamentId },
    select: { id: true, organizerId: true, mode: true, name: true }
  });
  if (!row || row.organizerId !== input.organizerId) {
    throw notFound("Tournament not found.");
  }

  await prisma.tournament.update({
    where: { id: row.id },
    data: {
      contributeToCareerLeaderboard: input.contributeToCareerLeaderboard,
      version: { increment: 1 }
    }
  });

  if (!input.contributeToCareerLeaderboard) {
    await prisma.organizerPlayerStatDelta.deleteMany({ where: { tournamentId: row.id } });
    return { mode: row.mode };
  }

  if (isKingOfTheCourtMode(row.mode)) {
    await backfillKohMatches({
      tournamentId: row.id,
      tournamentName: row.name,
      organizerId: input.organizerId,
      mode: "KING_OF_THE_COURT"
    });
    return { mode: row.mode };
  }

  const state = await new PrismaTournamentRepository().getById(row.id);
  if (state) await creditAllCompletedAmericanoMatches(state);
  return { mode: row.mode };
}

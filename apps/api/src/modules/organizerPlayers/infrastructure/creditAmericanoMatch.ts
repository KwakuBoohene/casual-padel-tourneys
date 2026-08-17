import { evaluateMatch } from "@padel/shared";
import type { Match } from "@padel/shared";

import { logger } from "../../../lib/logger.js";
import { prisma } from "../../../lib/prisma.js";
import type { TournamentState } from "../../../types/state.js";

import { creditKohMatchToOrganizerPlayers } from "./careerCredits.js";

function findMatch(tournament: TournamentState, matchId: string): Match | undefined {
  for (const round of tournament.rounds) {
    const match = round.matches.find((item) => item.id === matchId);
    if (match) return match;
  }
  return undefined;
}

function creditSides(match: Match, tournament: TournamentState): {
  winnerSide: "A" | "B";
  gamesA: number;
  gamesB: number;
} | null {
  if ((tournament.config.scoringMode ?? "AMERICANO_POINTS") === "REGULAR") {
    const regular = tournament.config.regularScoring;
    if (!regular || !match.sets?.length) return null;
    const evaluation = evaluateMatch(match.sets, regular, {
      a: match.matchTbA,
      b: match.matchTbB
    });
    if (!evaluation.complete || !evaluation.winner) return null;
    return {
      winnerSide: evaluation.winner,
      gamesA: evaluation.gamesWonA,
      gamesB: evaluation.gamesWonB
    };
  }
  if (match.scoreA === undefined || match.scoreB === undefined || match.scoreA === match.scoreB) {
    return null;
  }
  return {
    winnerSide: match.scoreA > match.scoreB ? "A" : "B",
    gamesA: match.scoreA,
    gamesB: match.scoreB
  };
}

/**
 * Credit a completed Americano/Mexicano match to the organizer career board.
 * Failures are logged and swallowed so score submit still succeeds.
 */
export async function creditAmericanoMatchIfComplete(input: {
  tournament: TournamentState;
  matchId: string;
}): Promise<void> {
  const { tournament, matchId } = input;
  if (tournament.config.contributeToCareerLeaderboard === false) return;
  const organizerId = tournament.organizerId;
  if (!organizerId) return;
  const match = findMatch(tournament, matchId);
  if (!match?.completed) return;
  const sides = creditSides(match, tournament);
  if (!sides) return;

  try {
    await prisma.$transaction(async (tx) => {
      await creditKohMatchToOrganizerPlayers({
        tx,
        organizerId,
        tournamentId: tournament.id,
        tournamentName: tournament.config.name,
        matchId,
        unitAPlayerIds: match.teamA,
        unitBPlayerIds: match.teamB,
        winnerSide: sides.winnerSide,
        gamesA: sides.gamesA,
        gamesB: sides.gamesB,
        tournamentMode: tournament.config.mode
      });
    });
  } catch (error) {
    logger.error("careerCredits/creditAmericanoMatchIfComplete failed", {
      tournamentId: tournament.id,
      matchId,
      error
    });
  }
}

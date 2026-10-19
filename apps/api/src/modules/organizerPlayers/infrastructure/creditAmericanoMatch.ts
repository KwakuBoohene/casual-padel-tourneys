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
  winnerSide: "A" | "B" | "DRAW";
  gamesA: number;
  gamesB: number;
  setsA: number;
  setsB: number;
  americanoPointsA: number;
  americanoPointsB: number;
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
      gamesB: evaluation.gamesWonB,
      setsA: evaluation.setsWonA,
      setsB: evaluation.setsWonB,
      americanoPointsA: 0,
      americanoPointsB: 0
    };
  }
  if (match.scoreA === undefined || match.scoreB === undefined) {
    return null;
  }
  if (match.scoreA === match.scoreB) {
    return {
      winnerSide: "DRAW",
      gamesA: 0,
      gamesB: 0,
      setsA: 0,
      setsB: 0,
      americanoPointsA: match.scoreA,
      americanoPointsB: match.scoreB
    };
  }
  const winnerA = match.scoreA > match.scoreB;
  return {
    winnerSide: winnerA ? "A" : "B",
    gamesA: winnerA ? 1 : 0,
    gamesB: winnerA ? 0 : 1,
    setsA: 0,
    setsB: 0,
    americanoPointsA: match.scoreA,
    americanoPointsB: match.scoreB
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
  // A voided match was never played: it must never reach the account leaderboard.
  if (!match?.completed || match.voidedAt) return;
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
        setsA: sides.setsA,
        setsB: sides.setsB,
        americanoPointsA: sides.americanoPointsA,
        americanoPointsB: sides.americanoPointsB,
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

/** Credit every completed match. Caller must already have set the tournament flag on. */
export async function creditAllCompletedAmericanoMatches(tournament: TournamentState): Promise<void> {
  const optedIn = {
    ...tournament,
    config: { ...tournament.config, contributeToCareerLeaderboard: true }
  };
  for (const round of optedIn.rounds) {
    for (const match of round.matches) {
      if (match.completed && !match.voidedAt) {
        await creditAmericanoMatchIfComplete({ tournament: optedIn, matchId: match.id });
      }
    }
  }
}

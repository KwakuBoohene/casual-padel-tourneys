import { buildNextMexicanoRound } from "../../../engine/mexicanoScheduler.js";
import type { TournamentState } from "../../../types/state.js";
import { logger } from "../../../lib/logger.js";

import { buildLeaderboard } from "./leaderboard.js";
import { applyCloseTournament } from "./closeOps.js";
import { assertMexicanoNotEnded, touch } from "./helpers.js";

export function applyAdvanceMexicanoRound(tournament: TournamentState): TournamentState {
  if (tournament.config.mode !== "MEXICANO") {
    throw new Error("advanceMexicanoRound requires a Mexicano tournament.");
  }
  assertMexicanoNotEnded(tournament);

  const ordered = [...tournament.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const locked = ordered.filter((round) => round.matches.every((match) => match.completed));
  if (locked.length === 0) {
    throw new Error("Finish the current round before generating the next.");
  }

  const lastLocked = locked[locked.length - 1];
  if (!ordered.slice(0, locked.length).every((round, index) => round.id === locked[index].id)) {
    throw new Error("Finish the current round before generating the next.");
  }

  const afterLocked = ordered.filter((round) => round.roundNumber > lastLocked.roundNumber);
  if (afterLocked.length > 0) {
    const midRound = afterLocked.find(
      (round) =>
        round.matches.some((match) => match.completed) &&
        round.matches.some((match) => !match.completed)
    );
    if (midRound) {
      throw new Error("Finish the current round before generating the next.");
    }
    const allVirgin = afterLocked.every((round) =>
      round.matches.every((match) => !match.completed)
    );
    if (allVirgin && afterLocked.length === 1) {
      throw new Error("Next round already generated.");
    }
  }

  tournament.rounds = ordered.filter((round) => round.roundNumber <= lastLocked.roundNumber);

  const next = buildNextMexicanoRound({
    players: tournament.players,
    courts: tournament.config.courts,
    variant: tournament.config.variant,
    roundNumber: lastLocked.roundNumber + 1,
    fixedPairs: tournament.fixedPairs
  });
  if (next.matches.length === 0) {
    throw new Error("Not enough players to build another Mexicano round.");
  }
  tournament.rounds.push(next);
  tournament.leaderboard = buildLeaderboard(
    tournament.players,
    tournament.config.scoringMode,
    tournament.rounds
  );
  touch(tournament);
  logger.info("domain/applyAdvanceMexicanoRound", {
    tournamentId: tournament.id,
    fromRound: lastLocked.roundNumber,
    toRound: next.roundNumber,
    matches: next.matches.length,
    version: tournament.version
  });
  return tournament;
}

export function applyEndMexicanoNight(tournament: TournamentState): TournamentState {
  if (tournament.config.mode !== "MEXICANO") {
    throw new Error("endMexicanoNight requires a Mexicano tournament.");
  }
  if (tournament.endedAt) {
    throw new Error("This Mexicano night has already ended.");
  }

  const voidedMatchCount = applyCloseTournament(tournament);
  logger.info("domain/applyEndMexicanoNight", {
    tournamentId: tournament.id,
    voidedMatchCount,
    roundsKept: tournament.rounds.length,
    version: tournament.version
  });
  return tournament;
}

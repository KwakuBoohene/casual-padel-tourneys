import type { Match, Player } from "@padel/shared";

import { awardDeltasForWinner, type Side } from "../../../engine/regularScoring.js";
import type { TournamentState } from "../../../types/state.js";
import { logger } from "../../../lib/logger.js";

import { buildLeaderboard } from "./leaderboard.js";
import { assertMexicanoNotEnded, findMatch, touch } from "./helpers.js";

function awardPoints(players: Player[], match: Match, scoreA: number, scoreB: number): void {
  const apply = (playerId: string, points: number): void => {
    const player = players.find((item) => item.id === playerId);
    if (player) {
      player.totalPoints += points;
    }
  };
  for (const playerId of match.teamA) {
    apply(playerId, scoreA);
  }
  for (const playerId of match.teamB) {
    apply(playerId, scoreB);
  }
}

function bumpGamesPlayed(players: Player[], match: Match, delta: number): void {
  for (const playerId of [...match.teamA, ...match.teamB]) {
    const player = players.find((item) => item.id === playerId);
    if (player) {
      player.gamesPlayed = Math.max(0, player.gamesPlayed + delta);
    }
  }
}

export function applyPointsScore(
  tournament: TournamentState,
  matchId: string,
  scoreA: number,
  scoreB: number
): TournamentState {
  assertMexicanoNotEnded(tournament);
  if ((tournament.config.scoringMode ?? "AMERICANO_POINTS") === "REGULAR") {
    throw new Error("Use submitRegularScore for Regular scoring tournaments.");
  }
  const lookup = findMatch(tournament.rounds, matchId);
  const wasCompleted = lookup.match.completed;
  if (wasCompleted) {
    const laterRoundStarted = tournament.rounds.some(
      (round) =>
        round.roundNumber > lookup.round.roundNumber &&
        (round.isLocked || round.matches.some((match) => match.completed))
    );
    const mexicanoNextExists =
      tournament.config.mode === "MEXICANO" &&
      tournament.rounds.some((round) => round.roundNumber > lookup.round.roundNumber);
    if (laterRoundStarted || mexicanoNextExists) {
      throw new Error("Cannot edit a score after a later round has started.");
    }
  }
  if (wasCompleted && lookup.match.scoreA !== undefined && lookup.match.scoreB !== undefined) {
    awardPoints(tournament.players, lookup.match, -lookup.match.scoreA, -lookup.match.scoreB);
  }
  lookup.match.scoreA = scoreA;
  lookup.match.scoreB = scoreB;
  lookup.match.completed = true;
  if (!wasCompleted) {
    bumpGamesPlayed(tournament.players, lookup.match, 1);
  }
  lookup.round.isLocked = lookup.round.matches.every((match) => match.completed);
  awardPoints(tournament.players, lookup.match, scoreA, scoreB);
  tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
  touch(tournament);
  logger.info("domain/applyPointsScore", {
    tournamentId: tournament.id,
    matchId,
    scoreA,
    scoreB,
    replaced: wasCompleted,
    version: tournament.version
  });
  return tournament;
}

function applyRegularAward(
  players: Player[],
  match: Match,
  winner: Side,
  evaluation: {
    setsWonA: number;
    setsWonB: number;
    gamesWonA: number;
    gamesWonB: number;
  },
  sign: 1 | -1
): void {
  const { winner: winDelta, loser: loseDelta } = awardDeltasForWinner(winner, evaluation);
  const apply = (playerId: string, delta: typeof winDelta): void => {
    const player = players.find((item) => item.id === playerId);
    if (!player) {
      return;
    }
    player.matchesWon = (player.matchesWon ?? 0) + sign * delta.matchesWon;
    player.matchesLost = (player.matchesLost ?? 0) + sign * delta.matchesLost;
    player.setsWon = (player.setsWon ?? 0) + sign * delta.setsWon;
    player.setsLost = (player.setsLost ?? 0) + sign * delta.setsLost;
    player.gamesWon = (player.gamesWon ?? 0) + sign * delta.gamesWon;
    player.gamesLost = (player.gamesLost ?? 0) + sign * delta.gamesLost;
  };
  const winnerIds = winner === "A" ? match.teamA : match.teamB;
  const loserIds = winner === "A" ? match.teamB : match.teamA;
  for (const playerId of winnerIds) {
    apply(playerId, winDelta);
  }
  for (const playerId of loserIds) {
    apply(playerId, loseDelta);
  }
}

export { awardPoints, bumpGamesPlayed, applyRegularAward };

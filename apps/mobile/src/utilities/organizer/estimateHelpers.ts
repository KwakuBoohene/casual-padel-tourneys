import type { Estimate, LiveTournamentState } from "../../types/organizer/tournament";
import type { ScoringMode, TournamentVariant } from "@padel/shared";

import { americanoMatchTimeMinutes, regularMatchTimeMinutes } from "./matchDuration";

/**
 * Round robin length is set by how many matchups exist, not by player count. Keep in sync with
 * the API's `roundRobinRounds` so the estimate matches the schedule that gets generated.
 */
export function roundRobinRounds(input: {
  playersCount: number;
  courts: number;
  variant: TournamentVariant;
}): number {
  if (input.variant === "TEAM") {
    const teams = Math.floor(input.playersCount / 2);
    const matchesPerRound = Math.max(1, Math.min(input.courts, Math.floor(teams / 2)));
    const totalMatches = teams < 2 ? 1 : (teams * (teams - 1)) / 2;
    return Math.max(1, Math.ceil(totalMatches / matchesPerRound));
  }
  const matchesPerRound = Math.max(1, Math.min(input.courts, Math.floor(input.playersCount / 4)));
  const gamesEach = roundRobinGames(input.variant, input.playersCount);
  const totalMatches = Math.ceil((input.playersCount * gamesEach) / 4);
  return Math.max(1, Math.ceil(totalMatches / matchesPerRound));
}

/**
 * Classic: everyone faces everyone once, about (players - 1) / 2 games each. Mixed: everyone
 * partners each player of the opposite gender once (one fewer when that count is odd, so the
 * matches divide evenly). Keep in sync with the API's `roundRobinGames`.
 */
function roundRobinGames(variant: TournamentVariant, playersCount: number): number {
  if (variant === "MIXED") {
    const perGender = Math.floor(playersCount / 2);
    return Math.max(1, perGender % 2 === 0 ? perGender : perGender - 1);
  }
  return Math.max(1, Math.ceil((playersCount - 1) / 2));
}

export function computeEstimate(input: {
  courtsText: string;
  pointsText: string;
  mode: "AMERICANO" | "MEXICANO";
  variant?: TournamentVariant;
  schedulingMode: "TARGET_GAMES" | "TOTAL_TIME" | "ROUND_ROBIN";
  targetGamesText: string;
  tournamentTimeText: string;
  playersCount: number;
  scoringMode?: ScoringMode;
  regularSetsToWin?: number;
}): Estimate | null {
  const courts = Number(input.courtsText);
  const pointsPerMatch = Number(input.pointsText);
  const scoringMode = input.scoringMode ?? "AMERICANO_POINTS";
  const regular = scoringMode === "REGULAR";

  if (!Number.isFinite(courts) || !Number.isInteger(courts) || courts < 1) {
    return null;
  }
  if (!regular && (!Number.isFinite(pointsPerMatch) || !Number.isInteger(pointsPerMatch) || pointsPerMatch < 1)) {
    return null;
  }

  const playersPerRound = courts * 4;
  const matchTime = regular
    ? regularMatchTimeMinutes(input.regularSetsToWin ?? 1)
    : americanoMatchTimeMinutes(pointsPerMatch);

  if (playersPerRound <= 0 || input.playersCount === 0 || !Number.isInteger(input.playersCount) || input.playersCount < 1) {
    return null;
  }
  if (input.playersCount < playersPerRound) {
    return null;
  }

  if (input.mode === "MEXICANO") {
    return null;
  }

  let rounds = 0;
  if (input.schedulingMode === "ROUND_ROBIN") {
    rounds = roundRobinRounds({
      playersCount: input.playersCount,
      courts,
      variant: input.variant ?? "CLASSIC"
    });
  } else if (input.schedulingMode === "TARGET_GAMES") {
    const targetGames = Number(input.targetGamesText);
    if (!Number.isFinite(targetGames) || !Number.isInteger(targetGames) || targetGames < 1) {
      return null;
    }
    rounds = Math.ceil((input.playersCount * targetGames) / playersPerRound);
  } else {
    const tournamentTime = Number(input.tournamentTimeText);
    if (!Number.isFinite(tournamentTime) || !Number.isInteger(tournamentTime) || tournamentTime < 10) {
      return null;
    }
    rounds = Math.ceil(tournamentTime / matchTime);
  }
  const durationMinutes = Math.ceil(rounds * matchTime);
  const gamesPerPlayer = Math.max(1, Math.round((rounds * playersPerRound) / input.playersCount));
  return { rounds, gamesPerPlayer, durationMinutes };
}

export function computeLiveTimeStatus(tournament: LiveTournamentState): {
  roundsLeft: number;
  estimatedMinutesLeft: number;
} {
  const roundsLeft = tournament.rounds.filter((round) => !round.matches.every((match) => match.completed)).length;
  const regular = (tournament.config.scoringMode ?? "AMERICANO_POINTS") === "REGULAR";
  const matchTimeMinutes = regular
    ? regularMatchTimeMinutes(tournament.config.regularScoring?.setsToWin ?? 1)
    : americanoMatchTimeMinutes(Number(tournament.config.pointsPerMatch));
  if (!Number.isFinite(matchTimeMinutes) || matchTimeMinutes <= 0) {
    return { roundsLeft, estimatedMinutesLeft: 0 };
  }
  return {
    roundsLeft,
    estimatedMinutesLeft: Math.ceil(roundsLeft * matchTimeMinutes)
  };
}

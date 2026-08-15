import type { Estimate, LiveTournamentState } from "../../types/organizer/tournament";
import type { ScoringMode } from "@padel/shared";

import { americanoMatchTimeMinutes, regularMatchTimeMinutes } from "./matchDuration";

export function computeEstimate(input: {
  courtsText: string;
  pointsText: string;
  mode: "AMERICANO" | "MEXICANO";
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

  let rounds = 0;
  if (input.schedulingMode === "ROUND_ROBIN") {
    rounds = Math.max(1, input.playersCount - 1);
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

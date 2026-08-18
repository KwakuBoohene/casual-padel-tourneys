import type { TournamentConfig } from "@padel/shared";

/** Keep in sync with mobile `REGULAR_MINUTES_PER_SET` (~12 min per set to win). */
export const REGULAR_MINUTES_PER_SET = 12;

export interface EstimatedTournament {
  rounds: number;
  gamesPerPlayer: number;
  durationMinutes: number;
}

export function estimateTournament(config: TournamentConfig): EstimatedTournament {
  const playersCount = config.players.length;
  const playersPerRound = config.courts * 4;
  const matchMinutes = matchDurationMinutes(config);
  let roundsFromTarget: number;
  if (config.schedulingMode === "ROUND_ROBIN") {
    roundsFromTarget = roundRobinRounds(config, playersCount);
  } else if (config.schedulingMode === "TARGET_GAMES") {
    roundsFromTarget = Math.ceil((playersCount * (config.targetGamesPerPlayer ?? 4)) / playersPerRound);
  } else {
    roundsFromTarget = Math.ceil((config.tournamentTimeMinutes ?? 90) / matchMinutes);
  }
  const rounds = Math.max(1, roundsFromTarget);
  const gamesPerPlayer = Math.max(1, Math.round((rounds * playersPerRound) / playersCount));
  const durationMinutes = Math.ceil(rounds * matchMinutes);
  return { rounds, gamesPerPlayer, durationMinutes };
}

/**
 * A round robin is defined by how many matchups exist, not by player count: with fewer courts
 * than the field can fill at once it simply takes more rounds to play them all.
 */
export function roundRobinRounds(config: TournamentConfig, playersCount: number): number {
  if (config.variant === "TEAM") {
    const teams = Math.floor(playersCount / 2);
    const matchesPerRound = Math.max(1, Math.min(config.courts, Math.floor(teams / 2)));
    const totalMatches = teams < 2 ? 1 : (teams * (teams - 1)) / 2;
    return Math.max(1, Math.ceil(totalMatches / matchesPerRound));
  }
  const matchesPerRound = Math.max(1, Math.min(config.courts, Math.floor(playersCount / 4)));
  const partnerships = playersCount < 2 ? 2 : (playersCount * (playersCount - 1)) / 2;
  return Math.max(1, Math.ceil(Math.ceil(partnerships / 2) / matchesPerRound));
}

export function matchDurationMinutes(config: TournamentConfig): number {
  if (config.scoringMode === "REGULAR") {
    const setsToWin = config.regularScoring?.setsToWin ?? 1;
    const sets = Number.isFinite(setsToWin) && setsToWin >= 1 ? Math.trunc(setsToWin) : 1;
    return sets * REGULAR_MINUTES_PER_SET;
  }
  return matchTimeMinutes(config.pointsPerMatch);
}

export function matchTimeMinutes(pointsPerMatch: number): number {
  return (pointsPerMatch * 35) / 60;
}

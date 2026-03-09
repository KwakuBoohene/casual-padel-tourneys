import type { TournamentConfig } from "@padel/shared";

export interface EstimatedTournament {
  rounds: number;
  gamesPerPlayer: number;
  durationMinutes: number;
}

export function estimateTournament(config: TournamentConfig): EstimatedTournament {
  const playersCount = config.players.length;
  const playersPerRound = config.courts * 4;
  let roundsFromTarget = 1;
  if (config.schedulingMode === "ROUND_ROBIN") {
    roundsFromTarget = Math.max(1, playersCount - 1);
  } else if (config.schedulingMode === "TARGET_GAMES") {
    roundsFromTarget = Math.ceil((playersCount * (config.targetGamesPerPlayer ?? 4)) / playersPerRound);
  } else {
    roundsFromTarget = Math.ceil((config.tournamentTimeMinutes ?? 90) / matchTimeMinutes(config.pointsPerMatch));
  }
  const rounds = Math.max(1, roundsFromTarget);
  const gamesPerPlayer = Math.max(1, Math.round((rounds * playersPerRound) / playersCount));
  const durationMinutes = Math.ceil(rounds * matchTimeMinutes(config.pointsPerMatch));
  return { rounds, gamesPerPlayer, durationMinutes };
}

export function matchTimeMinutes(pointsPerMatch: number): number {
  return (pointsPerMatch * 35) / 60;
}

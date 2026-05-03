import type { Player, Round } from "@padel/shared";
import type { TournamentState } from "../types/state.js";

export function calculateAverageGames(players: Player[]): number {
  if (players.length === 0) return 0;
  const total = players.reduce((sum, p) => sum + p.gamesPlayed, 0);
  return total / players.length;
}

export function calculateHandicap(avgGames: number, ratio: number = 0.5): number {
  return Math.floor(avgGames * ratio);
}

export function isCurrentRoundComplete(rounds: Round[]): boolean {
  if (rounds.length === 0) return true;
  const currentRound = rounds[rounds.length - 1];
  return currentRound.matches.every((m) => m.completed);
}

export function getIntegrationWaveCount(players: Player[]): number {
  const waves = players.map((p) => p.integrationWave).filter((wave): wave is number => wave !== undefined);
  return waves.length > 0 ? Math.max(...waves) : 0;
}

export function canIntegratePlayers(tournament: TournamentState): {
  can: boolean;
  reason?: string;
} {
  if (tournament.pendingPlayers.length < 2) {
    return { can: false, reason: "Need at least 2 pending players to integrate" };
  }

  if (tournament.integrationWaveCount >= 3) {
    return { can: false, reason: "Maximum integration waves (3) reached" };
  }

  if (!isCurrentRoundComplete(tournament.rounds)) {
    return { can: false, reason: "Cannot integrate during incomplete round" };
  }

  return { can: true };
}

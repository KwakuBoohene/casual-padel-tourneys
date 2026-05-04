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

  // Find the first locked round (a round that has been completed)
  const lastCompletedRound = rounds.find((round) => round.isLocked);

  if (!lastCompletedRound) {
    // No rounds completed yet - can't integrate before any play happens
    return false;
  }

  // Check if there's a round in progress (has started but not locked)
  const roundInProgress = rounds.find(
    (round) =>
      !round.isLocked &&
      round.matches.some((m) => m.completed || m.scoreA !== undefined || m.scoreB !== undefined)
  );

  if (roundInProgress) {
    // A round is currently being played - can't integrate mid-round
    return false;
  }

  // At least one round is complete and no round is in progress - OK to integrate
  return true;
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

  // TODO: Consider allowing integration if there's only 1 pending player and the last round ended with an odd number of players, to avoid giving byes. This would require tracking the number of active players in the last round.
  // Extract magic number 2 into a constant and add a comment about it being the minimum for a new match.
  if (tournament.integrationWaveCount >= 3) {
    return { can: false, reason: "Maximum integration waves (3) reached" };
  }

  if (!isCurrentRoundComplete(tournament.rounds)) {
    return { can: false, reason: "Cannot integrate during incomplete round" };
  }

  return { can: true };
}

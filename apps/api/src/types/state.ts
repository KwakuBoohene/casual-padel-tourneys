import type { LeaderboardEntry, Match, PendingPlayer, Player, Round, TournamentConfig, FixedPair } from "@padel/shared";

export interface TournamentState {
  id: string;
  config: TournamentConfig;
  players: Player[];
  rounds: Round[];
  version: number;
  leaderboard: LeaderboardEntry[];
  publicToken: string;
  createdAt: string;
  updatedAt: string;
  endedAt?: string | null;
  organizerId?: string;
  pendingPlayers: PendingPlayer[];
  integrationWaveCount: number;
  /** Team Mexicano fixed pairs (absent for Classic / Mixed). */
  fixedPairs?: FixedPair[];
}

export interface MatchLookup {
  round: Round;
  match: Match;
}

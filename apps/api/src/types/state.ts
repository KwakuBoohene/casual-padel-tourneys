import type { LeaderboardEntry, Match, Player, Round, TournamentConfig } from "@padel/shared";

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
  organizerId?: string;
}

export interface MatchLookup {
  round: Round;
  match: Match;
}

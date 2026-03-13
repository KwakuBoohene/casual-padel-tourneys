import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

export type SetupStep =
  | "LIST"
  | "ESTIMATOR"
  | "NAME"
  | "OPTIONS"
  | "PLAYERS"
  | "SETTINGS"
  | "LIVE"
  | "LEADERBOARD"
  | "PLAYER_GAMES"
  | "PROFILE";

export interface Estimate {
  rounds: number;
  gamesPerPlayer: number;
  durationMinutes: number;
}

export interface LiveTournamentState {
  id: string;
  publicToken: string;
  version: number;
  updatedAt: string;
  config: {
    name: string;
    mode: TournamentMode;
    variant: TournamentVariant;
    schedulingMode: SchedulingMode;
    courts: number;
    pointsPerMatch: number;
    targetGamesPerPlayer?: number;
    tournamentTimeMinutes?: number;
  };
  players: Array<{ id: string; name: string }>;
  leaderboard: Array<{ playerId: string; name: string; totalPoints: number; gamesPlayed: number; rank: number }>;
  rounds: Array<{
    id: string;
    roundNumber: number;
    isLocked: boolean;
    matches: Array<{
      id: string;
      court: number;
      teamA: [string, string];
      teamB: [string, string];
      scoreA?: number;
      scoreB?: number;
      completed: boolean;
    }>;
  }>;
}

export interface CreateTournamentResponse {
  data: LiveTournamentState;
}

export interface TournamentResponse {
  data: LiveTournamentState;
}

export interface TournamentListResponse {
  data: LiveTournamentState[];
}

export interface LeaderboardRow {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  totalPoints: number;
}

export interface PlayerGameRow {
  matchId: string;
  roundNumber: number;
  court: number;
  partner: string;
  opponents: [string, string];
  scoreText: string;
  result: "WIN" | "LOSS" | "DRAW" | "PENDING";
}

import type {
  MatchSet,
  PendingPlayer,
  RegularScoringConfig,
  SchedulingMode,
  ScoringMode,
  TournamentMode,
  TournamentVariant
} from "@padel/shared";

export type { Estimate, EstimatorCreateDraft, SetupStep } from "./setup";

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
    scoringMode?: ScoringMode;
    regularScoring?: RegularScoringConfig;
    targetGamesPerPlayer?: number;
    tournamentTimeMinutes?: number;
  };
  players: Array<{ id: string; name: string }>;
  pendingPlayers: PendingPlayer[];
  leaderboard: Array<{
    playerId: string;
    name: string;
    totalPoints: number;
    gamesPlayed: number;
    rank: number;
    matchesWon?: number;
    matchesLost?: number;
    setsWon?: number;
    setsLost?: number;
    gamesWon?: number;
    gamesLost?: number;
  }>;
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
      sets?: MatchSet[];
      matchTbA?: number;
      matchTbB?: number;
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
  pointsEarned: number | null;
  result: "WIN" | "LOSS" | "DRAW" | "PENDING";
}

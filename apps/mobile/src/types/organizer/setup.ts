import type { SchedulingMode, ScoringMode, TournamentMode, TournamentVariant } from "@padel/shared";

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
  | "PROFILE"
  | "ATTACH";

export interface Estimate {
  rounds: number;
  gamesPerPlayer: number;
  durationMinutes: number;
}

export type EstimatorCreateDraft = {
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  scoringMode?: ScoringMode;
  setsToWin?: number;
};

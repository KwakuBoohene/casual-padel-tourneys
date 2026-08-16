import type { SchedulingMode, ScoringMode, TournamentMode, TournamentVariant } from "@padel/shared";

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

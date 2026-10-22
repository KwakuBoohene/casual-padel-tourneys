import { z } from "zod";
import type { HistoricalCoverage } from "./historicalResults.js";

export const organizerPlayerRangeSchema = z.enum(["month", "year", "all"]);
export type OrganizerPlayerRange = z.infer<typeof organizerPlayerRangeSchema>;

export interface OrganizerPlayerLeaderboardRow {
  coverage?: HistoricalCoverage;
  rank: number;
  id: string;
  name: string;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  americanoPointsWon: number;
  americanoPointsLost: number;
  eventsPlayed: number;
}

/** Public career board: standings only, with no identifiers a visitor could probe. */
export interface PublicCareerBoardRow extends Omit<OrganizerPlayerLeaderboardRow, "id"> {}

export interface PublicCareerBoard {
  importedEvents?: number;
  organizerName: string;
  range: OrganizerPlayerRange;
  rows: PublicCareerBoardRow[];
}

export interface CareerShareResponse {
  /** Null when the organizer has not shared their board. */
  token: string | null;
}

export interface OrganizerPlayerLeaderboard {
  importedEvents?: number;
  range: OrganizerPlayerRange;
  rows: OrganizerPlayerLeaderboardRow[];
}

export interface OrganizerPlayerEventSummary {
  sourceKind?: "HISTORICAL_SUMMARY";
  importId?: string;
  tournamentId: string;
  tournamentName: string;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  americanoPointsWon: number;
  americanoPointsLost: number;
}

export interface OrganizerPlayerDetail {
  coverage?: HistoricalCoverage;
  id: string;
  name: string;
  range: OrganizerPlayerRange;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  americanoPointsWon: number;
  americanoPointsLost: number;
  eventsPlayed: number;
  recentEvents: OrganizerPlayerEventSummary[];
}

export const organizerPlayerStatusSchema = z.enum(["active", "archived"]);
export type OrganizerPlayerStatus = z.infer<typeof organizerPlayerStatusSchema>;

export interface OrganizerManagedPlayer {
  id: string;
  name: string;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  suggestedRestoreName?: string;
}

export const mergeOrganizerPlayersSchema = z.object({
  playerIdA: z.string().min(1),
  playerIdB: z.string().min(1),
  survivingName: z.string().trim().min(1).max(80)
});
export type MergeOrganizerPlayersInput = z.infer<typeof mergeOrganizerPlayersSchema>;

export const renameOrganizerPlayerSchema = z.object({
  name: z.string().trim().min(1).max(80)
});
export type RenameOrganizerPlayerInput = z.infer<typeof renameOrganizerPlayerSchema>;

export const bulkOrganizerPlayerIdsSchema = z.object({
  playerIds: z.array(z.string().min(1)).min(1).max(200)
});
export type BulkOrganizerPlayerIdsInput = z.infer<typeof bulkOrganizerPlayerIdsSchema>;

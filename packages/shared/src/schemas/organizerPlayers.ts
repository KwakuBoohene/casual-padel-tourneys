import { z } from "zod";

export const organizerPlayerRangeSchema = z.enum(["month", "year", "all"]);
export type OrganizerPlayerRange = z.infer<typeof organizerPlayerRangeSchema>;

export interface OrganizerPlayerLeaderboardRow {
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

export interface OrganizerPlayerLeaderboard {
  range: OrganizerPlayerRange;
  rows: OrganizerPlayerLeaderboardRow[];
}

export interface OrganizerPlayerEventSummary {
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

import { z } from "zod";

export const organizerPlayerRangeSchema = z.enum(["month", "year", "all"]);
export type OrganizerPlayerRange = z.infer<typeof organizerPlayerRangeSchema>;

export interface OrganizerPlayerLeaderboardRow {
  rank: number;
  id: string;
  name: string;
  gamesWon: number;
  matchesWon: number;
  gamesLost: number;
  matchesLost: number;
  eventsPlayed: number;
}

export interface OrganizerPlayerLeaderboard {
  range: OrganizerPlayerRange;
  rows: OrganizerPlayerLeaderboardRow[];
}

export interface OrganizerPlayerEventSummary {
  tournamentId: string;
  tournamentName: string;
  gamesWon: number;
  matchesWon: number;
}

export interface OrganizerPlayerDetail {
  id: string;
  name: string;
  range: OrganizerPlayerRange;
  gamesWon: number;
  matchesWon: number;
  gamesLost: number;
  matchesLost: number;
  eventsPlayed: number;
  recentEvents: OrganizerPlayerEventSummary[];
}

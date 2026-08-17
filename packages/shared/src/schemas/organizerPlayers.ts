import { z } from "zod";

export const organizerPlayerRangeSchema = z.enum(["month", "year", "all"]);
export type OrganizerPlayerRange = z.infer<typeof organizerPlayerRangeSchema>;

export interface OrganizerPlayerLeaderboardRow {
  rank: number;
  id: string;
  name: string;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
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
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
}

export interface OrganizerPlayerDetail {
  id: string;
  name: string;
  range: OrganizerPlayerRange;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  eventsPlayed: number;
  recentEvents: OrganizerPlayerEventSummary[];
}

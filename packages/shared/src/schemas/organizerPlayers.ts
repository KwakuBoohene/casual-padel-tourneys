import { z } from "zod";

import { tournamentModeSchema } from "./tournament.js";

export const organizerPlayerRangeSchema = z.enum(["month", "year", "all"]);
export type OrganizerPlayerRange = z.infer<typeof organizerPlayerRangeSchema>;

/**
 * Career board filter: `overall` sums every credited mode, otherwise one tournament mode.
 * The wire values stay the schema enum (`KING_OF_THE_HILL`); "King of the Court" is a UI label.
 */
export const organizerPlayerLeaderboardModeSchema = z.union([
  z.literal("overall"),
  tournamentModeSchema
]);
export type OrganizerPlayerLeaderboardMode = z.infer<typeof organizerPlayerLeaderboardModeSchema>;

export const ORGANIZER_PLAYER_SEARCH_MAX = 80;

/** Query for `GET /me/players/leaderboard`. `q` is a case-insensitive substring of the name. */
export const organizerPlayerLeaderboardQuerySchema = z.object({
  range: organizerPlayerRangeSchema.default("year"),
  mode: organizerPlayerLeaderboardModeSchema.default("overall"),
  q: z.string().max(ORGANIZER_PLAYER_SEARCH_MAX).optional()
});
export type OrganizerPlayerLeaderboardQuery = z.infer<typeof organizerPlayerLeaderboardQuerySchema>;

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
  mode: OrganizerPlayerLeaderboardMode;
  /** Echoed only when the caller searched. */
  q?: string;
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

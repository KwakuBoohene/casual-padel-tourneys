import { z } from "zod";

export const organizerPlayerRangeSchema = z.enum(["month", "year", "all"]);
export type OrganizerPlayerRange = z.infer<typeof organizerPlayerRangeSchema>;

/** Career board mode filter — `overall` aggregates all opted-in events. */
export const organizerPlayerLeaderboardModeSchema = z.enum([
  "overall",
  "AMERICANO",
  "MEXICANO",
  "KING_OF_THE_HILL"
]);
export type OrganizerPlayerLeaderboardMode = z.infer<typeof organizerPlayerLeaderboardModeSchema>;

export const organizerPlayerLeaderboardQuerySchema = z.object({
  range: organizerPlayerRangeSchema.default("year"),
  mode: organizerPlayerLeaderboardModeSchema.default("overall"),
  q: z.string().optional()
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
  rows: OrganizerPlayerLeaderboardRow[];
  /** Present when the client requested a mode filter. */
  mode?: OrganizerPlayerLeaderboardMode;
  /** Present when the client requested a name search. */
  q?: string;
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

/** Build `/me/players/leaderboard` query string from board filters. */
export function buildOrganizerPlayerLeaderboardQuery(
  params: Partial<OrganizerPlayerLeaderboardQuery> & { range: OrganizerPlayerRange }
): string {
  const search = new URLSearchParams();
  search.set("range", params.range);
  const mode = params.mode ?? "overall";
  if (mode !== "overall") {
    search.set("mode", mode);
  }
  const trimmed = params.q?.trim();
  if (trimmed) {
    search.set("q", trimmed);
  }
  return search.toString();
}

/** UI label for a career board mode chip (King of the Court, not enum slug). */
export function formatOrganizerPlayerLeaderboardMode(mode: OrganizerPlayerLeaderboardMode): string {
  if (mode === "AMERICANO") return "Americano";
  if (mode === "MEXICANO") return "Mexicano";
  if (mode === "KING_OF_THE_HILL") return "King of the Court";
  return "Overall";
}

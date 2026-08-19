import {
  STANDINGS_COLUMNS,
  standingsCells,
  standingsLineFromRecord
} from "../utils/standings.js";

/**
 * Format-neutral table. PDF and CSV both render this, so a column added to
 * `STANDINGS_COLUMNS` reaches every export without touching either renderer.
 */
export interface ExportTable {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  /** Rendered under the table — used to declare truncation rather than hide it. */
  note?: string;
}

export interface ExportMeta {
  title: string;
  subtitle?: string;
  note?: string;
}

/** A leaderboard row from either the in-event board or the career board. */
export interface LeaderboardExportRow {
  rank: number;
  name: string;
  wins: number;
  losses: number;
  draws?: number;
  gamesWon: number;
  gamesLost: number;
  americanoPointsWon?: number;
  americanoPointsLost?: number;
}

export const LEADERBOARD_EXPORT_HEADERS: string[] = [
  "#",
  "Player",
  ...STANDINGS_COLUMNS.map((column) => column.header)
];

export function buildLeaderboardExport(
  rows: LeaderboardExportRow[],
  meta: ExportMeta
): ExportTable {
  return {
    title: meta.title,
    subtitle: meta.subtitle,
    note: meta.note,
    headers: [...LEADERBOARD_EXPORT_HEADERS],
    rows: rows.map((row) => {
      const cells = standingsCells(standingsLineFromRecord(row));
      return [
        String(row.rank),
        row.name,
        ...STANDINGS_COLUMNS.map((column) => cells[column.key])
      ];
    })
  };
}

/** One credited match for one player — the rows behind a career leaderboard. */
export interface MatchExportRow {
  occurredAt: string;
  tournamentName: string;
  tournamentMode: string;
  playerName: string;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  gamesWon: number;
  gamesLost: number;
  americanoPointsWon: number;
  americanoPointsLost: number;
}

export const MATCHES_EXPORT_HEADERS = [
  "Date",
  "Tournament",
  "Mode",
  "Player",
  "MP",
  "W",
  "L",
  "D",
  "GW",
  "GL",
  "PW(A)",
  "PL(A)"
] as const;

/** ISO date only — exports are read in spreadsheets, where a time adds noise. */
function toDateOnly(occurredAt: string): string {
  const separator = occurredAt.indexOf("T");
  return separator === -1 ? occurredAt : occurredAt.slice(0, separator);
}

export function buildMatchesExport(rows: MatchExportRow[], meta: ExportMeta): ExportTable {
  return {
    title: meta.title,
    subtitle: meta.subtitle,
    note: meta.note,
    headers: [...MATCHES_EXPORT_HEADERS],
    rows: rows.map((row) => [
      toDateOnly(row.occurredAt),
      row.tournamentName,
      row.tournamentMode,
      row.playerName,
      String(row.matchesWon + row.matchesLost + row.matchesDrawn),
      String(row.matchesWon),
      String(row.matchesLost),
      String(row.matchesDrawn),
      String(row.gamesWon),
      String(row.gamesLost),
      String(row.americanoPointsWon),
      String(row.americanoPointsLost)
    ])
  };
}

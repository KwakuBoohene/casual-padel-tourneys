import {
  STANDINGS_COLUMNS,
  standingsCells,
  standingsLineFromRecord
} from "../utils/standings.js";

/** One table within an export. A document may hold several. */
export interface ExportSection {
  /** Shown above the table. Omitted for a single-section document. */
  heading?: string;
  headers: string[];
  rows: string[][];
  /** Rendered under the table — used to declare truncation rather than hide it. */
  note?: string;
}

/**
 * Format-neutral document. PDF and CSV both render this, so a column added to
 * `STANDINGS_COLUMNS` — or a whole new section — reaches every export without touching
 * either renderer.
 */
export interface ExportTable {
  title: string;
  subtitle?: string;
  sections: ExportSection[];
}

/** Convenience for the common single-table document. */
export function singleSection(
  meta: ExportMeta,
  section: Omit<ExportSection, "heading"> & { heading?: string }
): ExportTable {
  return {
    title: meta.title,
    subtitle: meta.subtitle,
    sections: [{ ...section, note: section.note ?? meta.note }]
  };
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

export function buildLeaderboardSection(
  rows: LeaderboardExportRow[],
  heading?: string
): ExportSection {
  return {
    heading,
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

export function buildLeaderboardExport(
  rows: LeaderboardExportRow[],
  meta: ExportMeta
): ExportTable {
  return singleSection(meta, buildLeaderboardSection(rows));
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

export function buildMatchesSection(rows: MatchExportRow[], heading?: string): ExportSection {
  return {
    heading,
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

export function buildMatchesExport(rows: MatchExportRow[], meta: ExportMeta): ExportTable {
  return singleSection(meta, buildMatchesSection(rows));
}

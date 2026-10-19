import {
  buildLeaderboardSection,
  buildMatchesSection,
  buildTournamentsSection,
  type ExportScope,
  type ExportSection,
  type ExportTable,
  type OrganizerPlayerRange
} from "@padel/shared";

import { rangeStart } from "../domain/careerRange.js";
import { isAmericanoPointsRow } from "../domain/careerStats.js";
import type { CareerMatchRow, OrganizerPlayersDeps } from "./ports.js";
import { getOrganizerPlayerLeaderboard } from "./readOrganizerPlayers.js";

/** Beyond this the PDF stops being something anyone reads; truncation is announced, never silent. */
export const CAREER_MATCHES_EXPORT_LIMIT = 5000;

const RANGE_LABEL: Record<OrganizerPlayerRange, string> = {
  month: "This month",
  year: "This year",
  all: "All time"
};

function subtitle(range: OrganizerPlayerRange, now: Date): string {
  return `${RANGE_LABEL[range]} · generated ${now.toISOString().slice(0, 10)}`;
}

export async function buildCareerLeaderboardExportTable(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  range: OrganizerPlayerRange,
  now = new Date()
): Promise<ExportTable> {
  return {
    title: "Account leaderboard",
    subtitle: subtitle(range, now),
    sections: [await careerLeaderboardSection(deps, organizerId, range)]
  };
}

/**
 * The account board for a period, optionally with the events and matches behind it.
 * `full` answers "give me the month/year and everything in it" in one file.
 */
export async function buildCareerExportDocument(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  range: OrganizerPlayerRange,
  scope: ExportScope,
  now = new Date()
): Promise<ExportTable> {
  const leaderboard = await careerLeaderboardSection(
    deps,
    organizerId,
    range,
    scope === "full" ? "Account leaderboard" : undefined
  );
  if (scope === "leaderboard") {
    return { title: "Account leaderboard", subtitle: subtitle(range, now), sections: [leaderboard] };
  }

  const { rows, note } = await careerMatchRows(deps, organizerId, range, now);
  return {
    title: "Account leaderboard",
    subtitle: subtitle(range, now),
    sections: [
      leaderboard,
      buildTournamentsSection(
        rows.map((row) => ({
          tournamentId: row.tournamentId,
          tournamentName: row.tournamentName,
          tournamentMode: row.tournamentMode,
          matchId: row.matchId,
          playerName: row.playerName,
          occurredAt: row.occurredAt.toISOString()
        }))
      ),
      { ...buildMatchesSection(toMatchExportRows(rows), "Matches"), note }
    ]
  };
}

export async function buildCareerMatchesExportTable(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  range: OrganizerPlayerRange,
  now = new Date()
): Promise<ExportTable> {
  const { rows, note } = await careerMatchRows(deps, organizerId, range, now);
  return {
    title: "Account matches",
    subtitle: subtitle(range, now),
    sections: [{ ...buildMatchesSection(toMatchExportRows(rows)), note }]
  };
}

async function careerLeaderboardSection(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  range: OrganizerPlayerRange,
  heading?: string
): Promise<ExportSection> {
  const board = await getOrganizerPlayerLeaderboard(deps, organizerId, range);
  return buildLeaderboardSection(
    board.rows.map((row) => ({
      rank: row.rank,
      name: row.name,
      wins: row.matchesWon,
      losses: row.matchesLost,
      draws: row.matchesDrawn,
      gamesWon: row.gamesWon,
      gamesLost: row.gamesLost,
      americanoPointsWon: row.americanoPointsWon,
      americanoPointsLost: row.americanoPointsLost
    })),
    heading
  );
}

async function careerMatchRows(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  range: OrganizerPlayerRange,
  now: Date
): Promise<{ rows: CareerMatchRow[]; note: string }> {
  // Ask for one extra row so a full page can be told apart from a truncated one.
  const fetched = await deps.repo.listMatchesForExport({
    organizerId,
    since: rangeStart(range, now),
    limit: CAREER_MATCHES_EXPORT_LIMIT + 1
  });
  const truncated = fetched.length > CAREER_MATCHES_EXPORT_LIMIT;
  const rows = truncated ? fetched.slice(0, CAREER_MATCHES_EXPORT_LIMIT) : fetched;

  const notes = [
    "Includes players later archived — the match still happened, so it stays in this list."
  ];
  if (truncated) {
    notes.unshift(
      `Truncated to the ${CAREER_MATCHES_EXPORT_LIMIT} most recent matches. Narrow the range to see more.`
    );
  }
  return { rows, note: notes.join(" ") };
}

function toMatchExportRows(rows: CareerMatchRow[]) {
  return rows.map((row) => {
    // Americano rows persist a 1/0 game count for a match win; games are a Regular concept.
    const americano = isAmericanoPointsRow(row);
    return {
      occurredAt: row.occurredAt.toISOString(),
      tournamentName: row.tournamentName,
      tournamentMode: row.tournamentMode,
      playerName: row.playerName,
      matchesWon: row.matchesWon,
      matchesLost: row.matchesLost,
      matchesDrawn: row.matchesDrawn,
      gamesWon: americano ? 0 : row.gamesWon,
      gamesLost: americano ? 0 : row.gamesLost,
      americanoPointsWon: row.americanoPointsWon,
      americanoPointsLost: row.americanoPointsLost
    };
  });
}

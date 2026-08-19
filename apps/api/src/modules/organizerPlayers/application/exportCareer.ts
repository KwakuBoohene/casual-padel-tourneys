import {
  buildLeaderboardExport,
  buildMatchesExport,
  type ExportTable,
  type OrganizerPlayerRange
} from "@padel/shared";

import { rangeStart } from "../domain/careerRange.js";
import { isAmericanoPointsRow } from "../domain/careerStats.js";
import type { OrganizerPlayersDeps } from "./ports.js";
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
  const board = await getOrganizerPlayerLeaderboard(deps, organizerId, range);
  return buildLeaderboardExport(
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
    { title: "Account leaderboard", subtitle: subtitle(range, now) }
  );
}

export async function buildCareerMatchesExportTable(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  range: OrganizerPlayerRange,
  now = new Date()
): Promise<ExportTable> {
  // Ask for one extra row so a full page can be told apart from a truncated one.
  const rows = await deps.repo.listMatchesForExport({
    organizerId,
    since: rangeStart(range, now),
    limit: CAREER_MATCHES_EXPORT_LIMIT + 1
  });
  const truncated = rows.length > CAREER_MATCHES_EXPORT_LIMIT;
  const kept = truncated ? rows.slice(0, CAREER_MATCHES_EXPORT_LIMIT) : rows;

  const notes = [
    "Includes players later archived — the match still happened, so it stays in this list."
  ];
  if (truncated) {
    notes.unshift(
      `Truncated to the ${CAREER_MATCHES_EXPORT_LIMIT} most recent matches. Narrow the range to see more.`
    );
  }

  return buildMatchesExport(
    kept.map((row) => {
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
    }),
    { title: "Account matches", subtitle: subtitle(range, now), note: notes.join(" ") }
  );
}

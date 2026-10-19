import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLeaderboardExport,
  buildMatchesExport,
  LEADERBOARD_EXPORT_HEADERS,
  MATCHES_EXPORT_HEADERS,
  type LeaderboardExportRow,
  type MatchExportRow
} from "../../src/export/exportTable.js";
import { STANDINGS_COLUMNS } from "../../src/utils/standings.js";

/** These builders produce single-section documents. */
function only(document: { sections: { headers: string[]; rows: string[][]; note?: string }[] }) {
  assert.equal(document.sections.length, 1);
  return document.sections[0];
}

function leaderboardRow(overrides: Partial<LeaderboardExportRow> = {}): LeaderboardExportRow {
  return {
    rank: 1,
    name: "Ana",
    wins: 3,
    losses: 1,
    draws: 1,
    gamesWon: 12,
    gamesLost: 7,
    americanoPointsWon: 60,
    americanoPointsLost: 40,
    ...overrides
  };
}

function matchRow(overrides: Partial<MatchExportRow> = {}): MatchExportRow {
  return {
    occurredAt: "2026-08-19T18:30:00.000Z",
    tournamentName: "Tuesday Night",
    tournamentMode: "AMERICANO",
    playerName: "Ana",
    matchesWon: 1,
    matchesLost: 0,
    matchesDrawn: 0,
    gamesWon: 0,
    gamesLost: 0,
    americanoPointsWon: 16,
    americanoPointsLost: 8,
    ...overrides
  };
}

test("leaderboard headers follow STANDINGS_COLUMNS so exports cannot drift from the table", () => {
  assert.deepEqual(LEADERBOARD_EXPORT_HEADERS, [
    "#",
    "Player",
    ...STANDINGS_COLUMNS.map((column) => column.header)
  ]);
});

test("leaderboard export emits one cell per column, in column order", () => {
  const table = buildLeaderboardExport([leaderboardRow()], { title: "Board" });

  assert.equal(only(table).rows.length, 1);
  assert.equal(only(table).rows[0].length, LEADERBOARD_EXPORT_HEADERS.length);
  assert.equal(only(table).rows[0][0], "1", "rank");
  assert.equal(only(table).rows[0][1], "Ana", "name");

  const cellsByHeader = Object.fromEntries(
    only(table).headers.map((header, index) => [header, only(table).rows[0][index]])
  );
  assert.equal(cellsByHeader.MP, "5", "wins + losses + draws");
  assert.equal(cellsByHeader.W, "3");
  assert.equal(cellsByHeader.L, "1");
  assert.equal(cellsByHeader.D, "1");
  assert.equal(cellsByHeader.GW, "12");
  assert.equal(cellsByHeader.GL, "7");
  assert.equal(cellsByHeader.GD, "+5");
  assert.equal(cellsByHeader["PW(A)"], "60");
  assert.equal(cellsByHeader["PL(A)"], "40");
  assert.equal(cellsByHeader.PTS, "3", "1 per match win");
});

test("leaderboard export defaults optional fields rather than emitting blanks", () => {
  const table = buildLeaderboardExport(
    [{ rank: 2, name: "Ben", wins: 1, losses: 1, gamesWon: 0, gamesLost: 0 }],
    { title: "Board" }
  );
  assert.ok(only(table).rows[0].every((cell) => cell !== "" && cell !== "undefined"));
});

test("an empty leaderboard still carries headers", () => {
  const table = buildLeaderboardExport([], { title: "Board" });
  assert.deepEqual(only(table).headers, LEADERBOARD_EXPORT_HEADERS);
  assert.deepEqual(only(table).rows, []);
});

test("matches export uses a date only and computes MP", () => {
  const table = buildMatchesExport([matchRow()], { title: "Matches" });

  assert.deepEqual(only(table).headers, [...MATCHES_EXPORT_HEADERS]);
  const cells = Object.fromEntries(
    only(table).headers.map((header, index) => [header, only(table).rows[0][index]])
  );
  assert.equal(cells.Date, "2026-08-19", "time is noise in a spreadsheet");
  assert.equal(cells.Tournament, "Tuesday Night");
  assert.equal(cells.Mode, "AMERICANO");
  assert.equal(cells.MP, "1");
  assert.equal(cells["PW(A)"], "16");
});

test("matches export counts a draw in MP", () => {
  const table = buildMatchesExport(
    [matchRow({ matchesWon: 0, matchesDrawn: 1 })],
    { title: "Matches" }
  );
  const cells = Object.fromEntries(
    only(table).headers.map((header, index) => [header, only(table).rows[0][index]])
  );
  assert.equal(cells.MP, "1");
  assert.equal(cells.D, "1");
  assert.equal(cells.W, "0");
});

test("meta title, subtitle and note are carried through", () => {
  const table = buildLeaderboardExport([], {
    title: "Tuesday Night",
    subtitle: "Americano · 19 Aug 2026",
    note: "Truncated."
  });
  assert.equal(table.title, "Tuesday Night");
  assert.equal(table.subtitle, "Americano · 19 Aug 2026");
  assert.equal(only(table).note, "Truncated.");
});

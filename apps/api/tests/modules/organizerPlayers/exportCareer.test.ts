import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCareerLeaderboardExportTable,
  buildCareerMatchesExportTable,
  CAREER_MATCHES_EXPORT_LIMIT
} from "../../../src/modules/organizerPlayers/application/exportCareer.js";
import type {
  CareerMatchQuery,
  CareerMatchRow,
  OrganizerPlayerRepository,
  OrganizerPlayersDeps
} from "../../../src/modules/organizerPlayers/application/ports.js";
import type { CareerDelta } from "../../../src/modules/organizerPlayers/domain/careerStats.js";

const NOW = new Date("2026-08-19T12:00:00.000Z");

function delta(overrides: Partial<CareerDelta> = {}): CareerDelta {
  return {
    organizerPlayerId: "p1",
    organizerPlayerName: "Ana",
    tournamentId: "t1",
    tournamentName: "Club Night",
    gamesWon: 0,
    gamesLost: 0,
    setsWon: 0,
    setsLost: 0,
    matchesWon: 1,
    matchesLost: 0,
    matchesDrawn: 0,
    americanoPointsWon: 16,
    americanoPointsLost: 8,
    ...overrides
  };
}

function matchRow(overrides: Partial<CareerMatchRow> = {}): CareerMatchRow {
  return {
    occurredAt: new Date("2026-08-19T18:30:00.000Z"),
    tournamentId: "t1",
    matchId: "m1",
    tournamentName: "Club Night",
    tournamentMode: "AMERICANO",
    playerName: "Ana",
    matchesWon: 1,
    matchesLost: 0,
    matchesDrawn: 0,
    gamesWon: 1,
    gamesLost: 0,
    americanoPointsWon: 16,
    americanoPointsLost: 8,
    ...overrides
  };
}

function deps(options: { deltas?: CareerDelta[]; matches?: CareerMatchRow[] } = {}): {
  deps: OrganizerPlayersDeps;
  queries: CareerMatchQuery[];
} {
  const queries: CareerMatchQuery[] = [];
  const repo = {
    async listDeltas() {
      return options.deltas ?? [];
    },
    async listMatchesForExport(query: CareerMatchQuery) {
      queries.push(query);
      return options.matches ?? [];
    }
  } as unknown as OrganizerPlayerRepository;
  return { deps: { repo }, queries };
}

function cellsOf(headers: string[], row: string[]): Record<string, string> {
  return Object.fromEntries(headers.map((header, index) => [header, row[index]]));
}

/** Career exports are single-section documents. */
function only(document: { sections: { headers: string[]; rows: string[][]; note?: string }[] }) {
  assert.equal(document.sections.length, 1, "career exports stay single-section");
  return document.sections[0];
}

test("board export carries the range and generation date", async () => {
  const { deps: d } = deps({ deltas: [delta()] });
  const table = await buildCareerLeaderboardExportTable(d, "org-1", "month", NOW);
  assert.equal(table.title, "Account leaderboard");
  assert.equal(table.subtitle, "This month · generated 2026-08-19");
});

test("board export maps career rows onto the standings columns", async () => {
  const { deps: d } = deps({
    deltas: [delta(), delta({ matchesWon: 0, matchesDrawn: 1, americanoPointsWon: 12, americanoPointsLost: 12 })]
  });
  const table = await buildCareerLeaderboardExportTable(d, "org-1", "all", NOW);
  const cells = cellsOf(only(table).headers, only(table).rows[0]);
  assert.equal(cells.Player, "Ana");
  assert.equal(cells.MP, "2");
  assert.equal(cells.W, "1");
  assert.equal(cells.D, "1");
  assert.equal(cells["PW(A)"], "28");
  assert.equal(cells.GW, "0", "Americano has no games");
});

test("an organizer with no career data still gets headers", async () => {
  const { deps: d } = deps({ deltas: [] });
  const table = await buildCareerLeaderboardExportTable(d, "org-1", "all", NOW);
  assert.ok(only(table).headers.length > 0);
  assert.deepEqual(only(table).rows, []);
});

test("matches export lists one row per credited match", async () => {
  const { deps: d } = deps({ matches: [matchRow(), matchRow({ playerName: "Ben" })] });
  const table = await buildCareerMatchesExportTable(d, "org-1", "all", NOW);
  assert.equal(only(table).rows.length, 2);
  const cells = cellsOf(only(table).headers, only(table).rows[0]);
  assert.equal(cells.Date, "2026-08-19");
  assert.equal(cells.Tournament, "Club Night");
  assert.equal(cells.Mode, "AMERICANO");
  assert.equal(cells.Player, "Ana");
  assert.equal(cells.MP, "1");
});

test("matches export zeroes the bogus game count on Americano rows", async () => {
  const { deps: d } = deps({ matches: [matchRow({ gamesWon: 1, gamesLost: 0 })] });
  const table = await buildCareerMatchesExportTable(d, "org-1", "all", NOW);
  const cells = cellsOf(only(table).headers, only(table).rows[0]);
  assert.equal(cells.GW, "0");
  assert.equal(cells.GL, "0");
  assert.equal(cells["PW(A)"], "16", "rally points are the Americano detail");
});

test("matches export keeps real game counts on Regular rows", async () => {
  const { deps: d } = deps({
    matches: [matchRow({ gamesWon: 6, gamesLost: 4, americanoPointsWon: 0, americanoPointsLost: 0 })]
  });
  const table = await buildCareerMatchesExportTable(d, "org-1", "all", NOW);
  const cells = cellsOf(only(table).headers, only(table).rows[0]);
  assert.equal(cells.GW, "6");
  assert.equal(cells.GL, "4");
});

test("matches export always says archived players are included", async () => {
  const { deps: d } = deps({ matches: [matchRow()] });
  const table = await buildCareerMatchesExportTable(d, "org-1", "all", NOW);
  assert.match(only(table).note ?? "", /archived/i);
});

test("matches export asks for one row beyond the cap so truncation is detectable", async () => {
  const { deps: d, queries } = deps({ matches: [matchRow()] });
  await buildCareerMatchesExportTable(d, "org-1", "all", NOW);
  assert.equal(queries[0].limit, CAREER_MATCHES_EXPORT_LIMIT + 1);
});

test("truncation is announced, never silent", async () => {
  const many = Array.from({ length: CAREER_MATCHES_EXPORT_LIMIT + 1 }, () => matchRow());
  const { deps: d } = deps({ matches: many });
  const table = await buildCareerMatchesExportTable(d, "org-1", "all", NOW);
  assert.equal(only(table).rows.length, CAREER_MATCHES_EXPORT_LIMIT);
  assert.match(only(table).note ?? "", /Truncated/);
});

test("an exact fit at the cap is not reported as truncated", async () => {
  const exact = Array.from({ length: CAREER_MATCHES_EXPORT_LIMIT }, () => matchRow());
  const { deps: d } = deps({ matches: exact });
  const table = await buildCareerMatchesExportTable(d, "org-1", "all", NOW);
  assert.equal(only(table).rows.length, CAREER_MATCHES_EXPORT_LIMIT);
  assert.doesNotMatch(only(table).note ?? "", /Truncated/);
});

test("the range narrows the query window", async () => {
  const { deps: d, queries } = deps({ matches: [] });
  await buildCareerMatchesExportTable(d, "org-1", "all", NOW);
  assert.equal(queries[0].since, null, "all time has no lower bound");

  await buildCareerMatchesExportTable(d, "org-1", "month", NOW);
  assert.equal(queries[1].since?.toISOString(), "2026-08-01T00:00:00.000Z");
});

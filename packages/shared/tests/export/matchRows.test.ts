import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTournamentsSection,
  buildTournamentMatchesSection,
  formatMatchScore,
  matchStatusLabel,
  TOURNAMENT_MATCH_HEADERS
} from "../../src/export/matchRows.js";

const NAMES = new Map([
  ["a", "Ana"],
  ["b", "Ben"],
  ["c", "Cam"],
  ["d", "Dee"]
]);

function match(overrides: Record<string, unknown> = {}) {
  return {
    court: 1,
    teamA: ["a", "b"] as [string, string],
    teamB: ["c", "d"] as [string, string],
    completed: true,
    scoreA: 16,
    scoreB: 8,
    ...overrides
  };
}

test("status is Completed, Not played, or Void", () => {
  assert.equal(matchStatusLabel({ completed: true }), "Completed");
  assert.equal(matchStatusLabel({ completed: false }), "Not played");
  assert.equal(matchStatusLabel({ completed: false, voidedAt: "2026-08-19T00:00:00.000Z" }), "Void");
});

test("void beats completed, so an abandoned match never reads as a result", () => {
  assert.equal(
    matchStatusLabel({ completed: true, voidedAt: "2026-08-19T00:00:00.000Z" }),
    "Void"
  );
});

test("Americano scores render as points", () => {
  assert.equal(formatMatchScore(match(), "AMERICANO_POINTS"), "16-8");
  assert.equal(formatMatchScore(match(), undefined), "16-8", "defaults to Americano");
});

test("an unplayed Americano match has no score", () => {
  assert.equal(
    formatMatchScore(match({ completed: false, scoreA: undefined, scoreB: undefined }), "AMERICANO_POINTS"),
    ""
  );
});

test("Regular scores render the set line", () => {
  const sets = [
    { setNumber: 1, gamesA: 6, gamesB: 4 },
    { setNumber: 2, gamesA: 3, gamesB: 6 },
    { setNumber: 3, gamesA: 7, gamesB: 5 }
  ];
  assert.equal(formatMatchScore(match({ sets }), "REGULAR"), "6-4 3-6 7-5");
});

test("a set tiebreak and a match tiebreak both show", () => {
  const sets = [{ setNumber: 1, gamesA: 6, gamesB: 6, tbA: 7, tbB: 5 }];
  assert.equal(formatMatchScore(match({ sets }), "REGULAR"), "6-6(7-5)");
  assert.equal(
    formatMatchScore(match({ sets, matchTbA: 10, matchTbB: 8 }), "REGULAR"),
    "6-6(7-5) TB 10-8"
  );
});

test("a voided match shows no score, whatever was entered before it stopped", () => {
  const voided = match({ completed: false, voidedAt: "2026-08-19T00:00:00.000Z", scoreA: 9, scoreB: 4 });
  assert.equal(formatMatchScore(voided, "AMERICANO_POINTS"), "");
  const voidedRegular = match({
    completed: false,
    voidedAt: "2026-08-19T00:00:00.000Z",
    sets: [{ setNumber: 1, gamesA: 3, gamesB: 1 }]
  });
  assert.equal(formatMatchScore(voidedRegular, "REGULAR"), "");
});

test("the section resolves player names and orders by round then court", () => {
  const section = buildTournamentMatchesSection({
    rounds: [
      { roundNumber: 2, matches: [match({ court: 2 }), match({ court: 1 })] },
      { roundNumber: 1, matches: [match({ court: 1 })] }
    ],
    playerNameById: NAMES,
    scoringMode: "AMERICANO_POINTS"
  });

  assert.deepEqual(section.headers, [...TOURNAMENT_MATCH_HEADERS]);
  assert.deepEqual(
    section.rows.map((row) => [row[0], row[1]]),
    [
      ["1", "1"],
      ["2", "1"],
      ["2", "2"]
    ]
  );
  assert.equal(section.rows[0][2], "Ana / Ben");
  assert.equal(section.rows[0][3], "Cam / Dee");
});

test("an unknown player id falls back to the id rather than blanking the team", () => {
  const section = buildTournamentMatchesSection({
    rounds: [{ roundNumber: 1, matches: [match({ teamA: ["zzz", "a"] })] }],
    playerNameById: NAMES
  });
  assert.equal(section.rows[0][2], "zzz / Ana");
});

test("the section is headed so it is distinguishable in a multi-section export", () => {
  const section = buildTournamentMatchesSection({ rounds: [], playerNameById: NAMES });
  assert.equal(section.heading, "Rounds and matches");
  assert.deepEqual(section.rows, []);
});

test("tournaments section groups events and counts distinct matches", () => {
  const rows = [
    { tournamentId: "t1", tournamentName: "Club Night", tournamentMode: "AMERICANO", matchId: "m1", playerName: "Ana", occurredAt: "2026-08-19T18:00:00.000Z" },
    { tournamentId: "t1", tournamentName: "Club Night", tournamentMode: "AMERICANO", matchId: "m1", playerName: "Ben", occurredAt: "2026-08-19T18:00:00.000Z" },
    { tournamentId: "t1", tournamentName: "Club Night", tournamentMode: "AMERICANO", matchId: "m2", playerName: "Ana", occurredAt: "2026-08-19T19:00:00.000Z" },
    { tournamentId: "t2", tournamentName: "Sunday", tournamentMode: "MEXICANO", matchId: "m3", playerName: "Cam", occurredAt: "2026-08-10T18:00:00.000Z" }
  ];

  const section = buildTournamentsSection(rows);
  assert.equal(section.heading, "Tournaments");
  assert.deepEqual(section.headers, ["Date", "Tournament", "Mode", "Players", "Matches"]);

  // Newest event first.
  assert.equal(section.rows[0][1], "Club Night");
  assert.equal(section.rows[1][1], "Sunday");

  // Two distinct matches, two distinct players — not four credit rows.
  assert.equal(section.rows[0][3], "2", "players");
  assert.equal(section.rows[0][4], "2", "matches");
  assert.equal(section.rows[0][0], "2026-08-19");
  assert.equal(section.rows[1][2], "MEXICANO");
});

test("a player with no career identity does not distort the match count", () => {
  // Only three of four players are credited; the match must still count once.
  const rows = ["Ana", "Ben", "Cam"].map((playerName) => ({
    tournamentId: "t1",
    tournamentName: "Club Night",
    tournamentMode: "AMERICANO",
    matchId: "m1",
    playerName,
    occurredAt: "2026-08-19T18:00:00.000Z"
  }));
  const section = buildTournamentsSection(rows);
  assert.equal(section.rows[0][4], "1");
});

test("an empty period still renders the tournaments header", () => {
  const section = buildTournamentsSection([]);
  assert.deepEqual(section.rows, []);
  assert.equal(section.headers.length, 5);
});

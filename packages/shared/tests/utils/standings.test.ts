import test from "node:test";
import assert from "node:assert/strict";

import {
  formatGameDiff,
  formatWinRate,
  gameWinRate,
  isWinRateEligible,
  matchWinRate,
  STANDINGS_COLUMNS,
  STANDINGS_HELP_ABBREVIATIONS,
  STANDINGS_HELP_BLURB,
  STANDINGS_LEGEND,
  STANDINGS_RANKING_STEPS,
  standingsCells,
  standingsLineFromRecord,
  WIN_RATE_MIN_GAMES,
  WIN_RATE_MIN_MATCHES,
  WIN_RATE_UNAVAILABLE
} from "../../src/utils/standings.js";

test("formatGameDiff prefixes positives", () => {
  assert.equal(formatGameDiff(12), "+12");
  assert.equal(formatGameDiff(0), "0");
  assert.equal(formatGameDiff(-4), "-4");
});

test("standingsLineFromRecord uses W+L+D as matches played", () => {
  const line = standingsLineFromRecord({
    wins: 8,
    losses: 3,
    draws: 1,
    gamesWon: 48,
    gamesLost: 32
  });
  assert.equal(line.matchesPlayed, 12);
  assert.deepEqual(standingsCells(line), {
    mp: "12",
    w: "8",
    l: "3",
    d: "1",
    gw: "48",
    gl: "32",
    gd: "+16",
    pwa: "0",
    pla: "0",
    pts: "8",
    mwr: "66.7%",
    gwr: "60.0%"
  });
});

test("standingsLineFromRecord maps Americano rally points", () => {
  const line = standingsLineFromRecord({
    wins: 1,
    losses: 0,
    gamesWon: 1,
    gamesLost: 0,
    americanoPointsWon: 24,
    americanoPointsLost: 18
  });
  assert.equal(standingsCells(line).pwa, "24");
  assert.equal(standingsCells(line).pla, "18");
});

test("standings help lists table columns including Americano rally abbreviations", () => {
  assert.equal(STANDINGS_HELP_ABBREVIATIONS[0]?.abbrev, "MP");
  assert.equal(STANDINGS_HELP_ABBREVIATIONS.at(-5)?.abbrev, "PW(A)");
  assert.equal(STANDINGS_HELP_ABBREVIATIONS.at(-4)?.abbrev, "PL(A)");
  assert.equal(STANDINGS_HELP_ABBREVIATIONS.at(-3)?.abbrev, "PTS");
  assert.ok(STANDINGS_RANKING_STEPS[0]?.startsWith("PTS"));
});

test("win rate columns are appended after PTS, never before it", () => {
  assert.deepEqual(
    STANDINGS_COLUMNS.map((column) => column.key).slice(-3),
    ["pts", "mwr", "gwr"]
  );
  assert.equal(STANDINGS_HELP_ABBREVIATIONS.at(-2)?.abbrev, "MWR");
  assert.equal(STANDINGS_HELP_ABBREVIATIONS.at(-1)?.abbrev, "GWR");
});

test("rank order is unchanged by win rate — it is a display column, not a ranking authority", () => {
  assert.equal(STANDINGS_RANKING_STEPS.length, 5);
  assert.ok(!STANDINGS_RANKING_STEPS.some((step) => /win rate|MWR|GWR/i.test(step)));
});

// --- eligibility -------------------------------------------------------------------------------

const gamesOnly = (gamesWon: number, gamesLost: number) =>
  standingsLineFromRecord({ wins: 1, losses: 1, gamesWon, gamesLost });

test("games arm: 14 games is short, 15 and 16 qualify", () => {
  assert.equal(isWinRateEligible(gamesOnly(7, 7)), false);
  assert.equal(isWinRateEligible(gamesOnly(8, 7)), true);
  assert.equal(isWinRateEligible(gamesOnly(8, 8)), true);
  assert.equal(WIN_RATE_MIN_GAMES, 15);
});

const matchesOnly = (played: number) =>
  standingsLineFromRecord({ wins: played, losses: 0, gamesWon: 0, gamesLost: 0 });

test("matches arm: 4 matches is short, 5 and 6 qualify, with no games at all", () => {
  assert.equal(isWinRateEligible(matchesOnly(4)), false);
  assert.equal(isWinRateEligible(matchesOnly(5)), true);
  assert.equal(isWinRateEligible(matchesOnly(6)), true);
  assert.equal(WIN_RATE_MIN_MATCHES, 5);
});

test("the arms are OR, not AND — either alone is enough", () => {
  const gamesArmOnly = standingsLineFromRecord({ wins: 2, losses: 2, gamesWon: 20, gamesLost: 4 });
  assert.equal(gamesArmOnly.matchesPlayed, 4);
  assert.equal(isWinRateEligible(gamesArmOnly), true);

  const matchArmOnly = standingsLineFromRecord({ wins: 3, losses: 3, gamesWon: 2, gamesLost: 1 });
  assert.equal(matchArmOnly.gamesWon + matchArmOnly.gamesLost, 3);
  assert.equal(isWinRateEligible(matchArmOnly), true);
});

// --- the rates ---------------------------------------------------------------------------------

test("a draw dilutes match win rate exactly like a loss", () => {
  const line = standingsLineFromRecord({
    wins: 10,
    losses: 5,
    draws: 5,
    gamesWon: 0,
    gamesLost: 0
  });
  assert.equal(line.matchesPlayed, 20);
  assert.equal(matchWinRate(line), 0.5);
  assert.equal(standingsCells(line).mwr, "50.0%");
});

test("game win rate is null when no games were recorded, even for an eligible player", () => {
  const americanoOnly = standingsLineFromRecord({
    wins: 4,
    losses: 2,
    gamesWon: 0,
    gamesLost: 0
  });
  assert.equal(isWinRateEligible(americanoOnly), true);
  assert.equal(matchWinRate(americanoOnly), 4 / 6);
  assert.equal(gameWinRate(americanoOnly), null);
  assert.equal(standingsCells(americanoOnly).gwr, WIN_RATE_UNAVAILABLE);
});

test("an ineligible player shows a dash in both columns, never 0%", () => {
  const newcomer = standingsLineFromRecord({ wins: 0, losses: 2, gamesWon: 3, gamesLost: 5 });
  assert.equal(matchWinRate(newcomer), null);
  assert.equal(gameWinRate(newcomer), null);
  const cells = standingsCells(newcomer);
  assert.equal(cells.mwr, WIN_RATE_UNAVAILABLE);
  assert.equal(cells.gwr, WIN_RATE_UNAVAILABLE);
  assert.notEqual(cells.mwr, "0.0%");
});

test("a genuine zero is 0.0%, which is not the same as unavailable", () => {
  const allDraws = standingsLineFromRecord({
    wins: 0,
    losses: 0,
    draws: 5,
    gamesWon: 0,
    gamesLost: 0
  });
  assert.equal(isWinRateEligible(allDraws), true);
  assert.equal(matchWinRate(allDraws), 0);
  assert.equal(standingsCells(allDraws).mwr, "0.0%");
});

test("a player with nothing played is null rather than dividing by zero", () => {
  const empty = standingsLineFromRecord({ wins: 0, losses: 0, gamesWon: 0, gamesLost: 0 });
  assert.equal(matchWinRate(empty), null);
  assert.equal(gameWinRate(empty), null);
});

// --- formatting --------------------------------------------------------------------------------

test("formatWinRate keeps one decimal so columns stay aligned", () => {
  assert.equal(formatWinRate(1), "100.0%");
  assert.equal(formatWinRate(0), "0.0%");
  assert.equal(formatWinRate(2 / 3), "66.7%");
  assert.equal(formatWinRate(0.625), "62.5%");
  assert.equal(formatWinRate(null), WIN_RATE_UNAVAILABLE);
});

test("help copy states the threshold using the real constants, so it cannot drift", () => {
  assert.ok(STANDINGS_HELP_BLURB.includes(String(WIN_RATE_MIN_GAMES)));
  assert.ok(STANDINGS_HELP_BLURB.includes(String(WIN_RATE_MIN_MATCHES)));
  assert.ok(STANDINGS_HELP_BLURB.includes(WIN_RATE_UNAVAILABLE));
  assert.ok(STANDINGS_LEGEND.includes("MWR"));
  assert.ok(STANDINGS_LEGEND.includes("GWR"));
  assert.ok(STANDINGS_HELP_ABBREVIATIONS.at(-1)?.meaning.includes(String(WIN_RATE_MIN_MATCHES)));
});

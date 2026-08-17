import test from "node:test";
import assert from "node:assert/strict";

import {
  countNoun,
  formatCareerStandings,
  formatRegularStandings,
  noun,
  wonLostNoun
} from "../../src/utils/countNoun.js";

test("noun is singular only when the count is 1", () => {
  assert.equal(noun(1, "match", "matches"), "match");
  assert.equal(noun(0, "match", "matches"), "matches");
  assert.equal(noun(2, "set", "sets"), "sets");
});

test("countNoun prefixes the number", () => {
  assert.equal(countNoun(1, "game", "games"), "1 game");
  assert.equal(countNoun(6, "game", "games"), "6 games");
});

test("wonLostNoun is singular when the record is one contest", () => {
  assert.equal(wonLostNoun(1, 0, "match", "matches"), "1–0 match");
  assert.equal(wonLostNoun(0, 1, "set", "sets"), "0–1 set");
  assert.equal(wonLostNoun(1, 1, "match", "matches"), "1–1 matches");
});

test("formatCareerStandings uses singular units for a 1–0 record", () => {
  assert.equal(
    formatCareerStandings({
      matchesWon: 1,
      matchesLost: 0,
      setsWon: 1,
      setsLost: 0,
      gamesWon: 1,
      gamesLost: 0
    }),
    "1–0 match · 1–0 set · 1–0 game"
  );
});

test("formatCareerStandings keeps plurals for mixed records", () => {
  assert.equal(
    formatCareerStandings({
      matchesWon: 3,
      matchesLost: 1,
      setsWon: 5,
      setsLost: 2,
      gamesWon: 22,
      gamesLost: 14
    }),
    "3–1 matches · 5–2 sets · 22–14 games"
  );
});

test("formatRegularStandings singularizes set and game wins", () => {
  assert.equal(
    formatRegularStandings({ wins: 1, losses: 0, setsWon: 1, gamesWon: 6 }),
    "1–0 match · 1 set · 6 games"
  );
});

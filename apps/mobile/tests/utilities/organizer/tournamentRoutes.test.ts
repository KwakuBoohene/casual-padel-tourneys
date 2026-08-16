import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  tournamentLeaderboardPath,
  tournamentLivePath,
  tournamentPlayerGamesPath
} from "../../../src/utilities/organizer/tournamentRoutes";
import { sanitizeWholeNumberInput } from "../../../src/utilities/organizer/sanitizeInput";
import {
  americanoMatchTimeMinutes,
  regularMatchTimeMinutes
} from "../../../src/utilities/organizer/matchDuration";

describe("tournamentRoutes", () => {
  it("builds live / leaderboard / player paths", () => {
    assert.equal(tournamentLivePath("abc"), "/tournaments/abc");
    assert.equal(tournamentLivePath("abc", true), "/tournaments/abc?edit=1");
    assert.equal(tournamentLeaderboardPath("abc"), "/tournaments/abc/leaderboard");
    assert.equal(tournamentPlayerGamesPath("abc", "p1"), "/tournaments/abc/players/p1");
  });
});

describe("sanitizeWholeNumberInput", () => {
  it("strips non-digits", () => {
    assert.equal(sanitizeWholeNumberInput("12a3"), "123");
    assert.equal(sanitizeWholeNumberInput(" 4.5 "), "45");
  });
});

describe("matchDuration", () => {
  it("computes Regular and Americano duration heuristics", () => {
    assert.equal(regularMatchTimeMinutes(2), 24);
    assert.equal(regularMatchTimeMinutes(0), 12);
    assert.equal(americanoMatchTimeMinutes(24), 14);
  });
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildOrganizerPlayerLeaderboardQuery } from "../../src/schemas/organizerPlayers.js";

test("buildOrganizerPlayerLeaderboardQuery includes range and optional filters", () => {
  assert.equal(buildOrganizerPlayerLeaderboardQuery({ range: "year" }), "range=year");
  assert.equal(
    buildOrganizerPlayerLeaderboardQuery({ range: "all", mode: "MEXICANO" }),
    "range=all&mode=MEXICANO"
  );
  assert.equal(
    buildOrganizerPlayerLeaderboardQuery({ range: "month", mode: "overall", q: " ann " }),
    "range=month&q=ann"
  );
});

test("buildOrganizerPlayerLeaderboardQuery encodes search text", () => {
  assert.equal(
    buildOrganizerPlayerLeaderboardQuery({ range: "year", q: "joão" }),
    "range=year&q=jo%C3%A3o"
  );
});

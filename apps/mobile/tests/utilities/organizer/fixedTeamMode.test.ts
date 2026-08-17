import assert from "node:assert/strict";
import test from "node:test";

import {
  isFixedTeamMode,
  minTeamsForMode,
  teamModeLabel
} from "../../../src/utilities/organizer/fixedTeamMode";

test("isFixedTeamMode is Team on Americano or Mexicano only", () => {
  assert.equal(isFixedTeamMode("AMERICANO", "TEAM"), true);
  assert.equal(isFixedTeamMode("MEXICANO", "TEAM"), true);
  assert.equal(isFixedTeamMode("AMERICANO", "CLASSIC"), false);
  assert.equal(isFixedTeamMode("KING_OF_THE_COURT", "TEAM"), false);
});

test("minTeamsForMode uses Americano 2 and Mexicano 4", () => {
  assert.equal(minTeamsForMode("AMERICANO"), 2);
  assert.equal(minTeamsForMode("MEXICANO"), 4);
});

test("teamModeLabel names the product", () => {
  assert.equal(teamModeLabel("AMERICANO"), "Team Americano");
  assert.equal(teamModeLabel("MEXICANO"), "Team Mexicano");
});

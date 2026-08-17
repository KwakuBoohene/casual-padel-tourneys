import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatScoringLabel,
  formatTournamentMode,
  formatTournamentModeVariant,
  formatTournamentVariant
} from "../../../src/utilities/organizer/formatLabels";

describe("formatLabels", () => {
  it("formats modes", () => {
    assert.equal(formatTournamentMode("AMERICANO"), "Americano");
    assert.equal(formatTournamentMode("MEXICANO"), "Mexicano");
    assert.equal(formatTournamentMode("KING_OF_THE_COURT"), "King of the Court");
  });

  it("formats variants and combined labels", () => {
    assert.equal(formatTournamentVariant("CLASSIC"), "Classic");
    assert.equal(formatTournamentVariant("MIXED"), "Mixed");
    assert.equal(formatTournamentVariant("TEAM"), "Team");
    assert.equal(formatTournamentModeVariant("MEXICANO", "TEAM"), "Mexicano / Team");
  });

  it("formats scoring labels", () => {
    assert.equal(formatScoringLabel("AMERICANO", "REGULAR"), "Regular scoring");
    assert.equal(formatScoringLabel("MEXICANO", "AMERICANO_POINTS"), "Mexicano scoring");
  });
});

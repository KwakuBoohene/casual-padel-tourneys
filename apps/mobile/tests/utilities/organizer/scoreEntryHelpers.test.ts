import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateAmericanoScores } from "../../../src/utilities/organizer/scoreEntryHelpers";

describe("validateAmericanoScores", () => {
  it("requires both sides", () => {
    assert.equal(validateAmericanoScores(null, null, 24), "Enter scores for both teams before saving.");
    assert.equal(validateAmericanoScores(null, 12, 24), "Enter a score for the first team.");
    assert.equal(validateAmericanoScores(12, null, 24), "Enter a score for the second team.");
  });

  it("rejects scores over the points target", () => {
    assert.equal(validateAmericanoScores(25, 0, 24), "Scores cannot exceed 24 points.");
  });

  it("requires scores to sum to pointsPerMatch", () => {
    assert.equal(validateAmericanoScores(10, 10, 24), "Americano scores must add up to 24 points.");
  });

  it("accepts a valid pair", () => {
    assert.equal(validateAmericanoScores(14, 10, 24), null);
  });
});

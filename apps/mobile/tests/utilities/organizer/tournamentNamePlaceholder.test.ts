import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { tournamentNamePlaceholder } from "../../../src/utilities/organizer/tournamentNamePlaceholder";

describe("tournamentNamePlaceholder", () => {
  it("formats Sunday evening Americano", () => {
    const sundayEvening = new Date(2026, 7, 16, 18, 30);
    assert.equal(tournamentNamePlaceholder(sundayEvening, "AMERICANO"), "Sunday Evening Americano");
  });

  it("formats Friday evening King of the Court", () => {
    const fridayEvening = new Date(2026, 7, 14, 19, 0);
    assert.equal(
      tournamentNamePlaceholder(fridayEvening, "KING_OF_THE_COURT"),
      "Friday Evening King of the Court"
    );
  });

  it("uses time-of-day bands", () => {
    assert.equal(
      tournamentNamePlaceholder(new Date(2026, 7, 16, 8, 0), "MEXICANO"),
      "Sunday Morning Mexicano"
    );
    assert.equal(
      tournamentNamePlaceholder(new Date(2026, 7, 16, 14, 0), "MEXICANO"),
      "Sunday Afternoon Mexicano"
    );
    assert.equal(
      tournamentNamePlaceholder(new Date(2026, 7, 16, 23, 0), "AMERICANO"),
      "Sunday Night Americano"
    );
    assert.equal(
      tournamentNamePlaceholder(new Date(2026, 7, 16, 3, 0), "AMERICANO"),
      "Sunday Night Americano"
    );
  });

  it("defaults style to Americano when mode is unknown", () => {
    assert.equal(tournamentNamePlaceholder(new Date(2026, 7, 16, 12, 0)), "Sunday Afternoon Americano");
    assert.equal(tournamentNamePlaceholder(new Date(2026, 7, 16, 12, 0), null), "Sunday Afternoon Americano");
  });
});

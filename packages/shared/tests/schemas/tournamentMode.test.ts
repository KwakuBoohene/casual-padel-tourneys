import assert from "node:assert/strict";
import test from "node:test";

import { tournamentModeInputSchema } from "../../src/schemas/tournament.ts";

test("tournamentModeInputSchema normalizes legacy KING_OF_THE_HILL", () => {
  assert.equal(tournamentModeInputSchema.parse("KING_OF_THE_HILL"), "KING_OF_THE_COURT");
  assert.equal(tournamentModeInputSchema.parse("KING_OF_THE_COURT"), "KING_OF_THE_COURT");
});

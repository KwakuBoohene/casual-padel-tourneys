import assert from "node:assert/strict";
import test from "node:test";

import {
  createKohTournamentSchema,
  kohUnitInputSchema
} from "../../src/schemas/koh.ts";

const regularScoring = {
  setFormat: "FULL_SET" as const,
  gameWinBy: 2 as const,
  setsToWin: 1,
  setTiebreakTo: 7 as const
};

test("kohUnitInputSchema accepts a doubles pair", () => {
  const parsed = kohUnitInputSchema.parse({
    playerA: { name: "Alex" },
    playerB: { name: "Sam" }
  });
  assert.equal(parsed.playerA.name, "Alex");
  assert.equal(parsed.playerB.name, "Sam");
});

test("kohUnitInputSchema rejects identical player names", () => {
  const result = kohUnitInputSchema.safeParse({
    playerA: { name: "Alex" },
    playerB: { name: "alex" }
  });
  assert.equal(result.success, false);
});

test("kohUnitInputSchema rejects a one-player shaped payload", () => {
  const result = kohUnitInputSchema.safeParse({
    playerA: { name: "Alex" }
  });
  assert.equal(result.success, false);
});

test("createKohTournamentSchema accepts 1-court KOH without promo", () => {
  const parsed = createKohTournamentSchema.parse({
    name: "Court 1 Clash",
    mode: "KING_OF_THE_COURT",
    courts: 1,
    regularScoring
  });
  assert.equal(parsed.pairingMode, "WINNER_STAYS");
  assert.equal(parsed.courts, 1);
  assert.equal(parsed.promotionRules, undefined);
});

test("createKohTournamentSchema requires promo rules when courts ≥ 2", () => {
  const missing = createKohTournamentSchema.safeParse({
    name: "Two Courts",
    mode: "KING_OF_THE_COURT",
    courts: 2,
    regularScoring
  });
  assert.equal(missing.success, false);

  const parsed = createKohTournamentSchema.parse({
    name: "Two Courts",
    mode: "KING_OF_THE_COURT",
    courts: 2,
    regularScoring,
    promotionRules: [{ courtNumber: 2, winsRequired: 3 }]
  });
  assert.equal(parsed.promotionRules?.length, 1);
});

test("createKohTournamentSchema accepts legacy KING_OF_THE_HILL mode input", () => {
  const parsed = createKohTournamentSchema.parse({
    name: "Legacy Court",
    mode: "KING_OF_THE_HILL",
    courts: 1,
    regularScoring
  });
  assert.equal(parsed.mode, "KING_OF_THE_COURT");
});

test("createKohTournamentSchema rejects promo rules on a single court", () => {
  const result = createKohTournamentSchema.safeParse({
    name: "Solo Court",
    mode: "KING_OF_THE_COURT",
    courts: 1,
    regularScoring,
    promotionRules: [{ courtNumber: 2, winsRequired: 2 }]
  });
  assert.equal(result.success, false);
});

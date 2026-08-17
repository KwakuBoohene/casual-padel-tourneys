import assert from "node:assert/strict";
import test from "node:test";

import {
  addPairToActiveCourt,
  moveSelectedUnit,
  randomizeActiveCourtUnits
} from "../../../src/utilities/koh/assignDraftActions";
import {
  balanceHintForCounts,
  createEmptyDraft,
  courtsReadyToStart,
  syncCourts,
  validatePairNames
} from "../../../src/utilities/koh/createDraft";
import { buildCreatePayload } from "../../../src/utilities/koh/createPayload";
import { regularScoringFromDraft } from "../../../src/utilities/koh/regularScoringFromDraft";

test("validatePairNames rejects one-name and duplicate names", () => {
  assert.equal(validatePairNames("Alex", ""), "Both player names are required.");
  assert.equal(validatePairNames("Alex", "Alex"), "A pair needs two different players.");
  assert.equal(validatePairNames("Alex", "Sam"), null);
});

test("balanceHint when court sizes differ by more than 1", () => {
  assert.equal(balanceHintForCounts([4, 4, 4]), null);
  assert.match(balanceHintForCounts([4, 4, 2]) ?? "", /differ/i);
});

test("syncCourts builds promo rules and skips promo for single court", () => {
  const one = syncCourts(createEmptyDraft(), 1);
  assert.equal(one.promoRules.length, 0);
  assert.equal(one.courtUnits.length, 1);
  const three = syncCourts(createEmptyDraft(), 3);
  assert.equal(three.promoRules.length, 2);
  assert.equal(three.courtUnits.length, 3);
});

test("addPairToActiveCourt and courtsReadyToStart", () => {
  let draft = syncCourts(createEmptyDraft(), 1);
  const first = addPairToActiveCourt(draft, "A", "B");
  assert.equal(first.error, null);
  draft = first.draft!;
  const second = addPairToActiveCourt(draft, "C", "D");
  assert.equal(second.error, null);
  draft = second.draft!;
  assert.equal(courtsReadyToStart(draft.courtUnits), true);
  const dup = addPairToActiveCourt(draft, "A", "E");
  assert.match(dup.error ?? "", /already/i);
});

test("randomize and move selected unit", () => {
  let draft = syncCourts(createEmptyDraft(), 1);
  draft = addPairToActiveCourt(draft, "A", "B").draft!;
  draft = addPairToActiveCourt(draft, "C", "D").draft!;
  draft = addPairToActiveCourt(draft, "E", "F").draft!;
  const middleId = draft.courtUnits[0].units[1].id;
  draft = { ...draft, selectedUnitId: middleId };
  draft = moveSelectedUnit(draft, -1);
  assert.equal(draft.courtUnits[0].units[0].id, middleId);
  const shuffled = randomizeActiveCourtUnits(draft);
  assert.equal(shuffled.courtUnits[0].units.length, 3);
});

test("regularScoringFromDraft and create payload", () => {
  const scoring = regularScoringFromDraft("BO3_GAMES", "GOLDEN");
  assert.equal(scoring.setFormat, "BO3_GAMES");
  assert.equal(scoring.gameWinBy, 1);
  const full = regularScoringFromDraft("FULL_SET", "ADVANTAGE");
  assert.equal(full.setTiebreakTo, 7);
  const draft = syncCourts(
    { ...createEmptyDraft(), name: "Ladder Night", matchFormat: "BO3_GAMES", deuceMode: "GOLDEN" },
    2
  );
  const payload = buildCreatePayload(draft);
  assert.equal(payload.mode, "KING_OF_THE_COURT");
  assert.equal(payload.courts, 2);
  assert.ok(payload.promotionRules && payload.promotionRules.length >= 1);
});

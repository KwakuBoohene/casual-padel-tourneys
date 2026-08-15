import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKohScorePayload,
  changeKohGames,
  emptyKohScoreDraft,
  kohScoreCanComplete,
  syncWinMethodLengths
} from "../../../src/utilities/koh/scorePayload";
import { formatCourtChangeLines } from "../../../src/utilities/koh/courtChangeCopy";

test("koh score draft pads win methods to game counts", () => {
  let draft = emptyKohScoreDraft();
  draft = changeKohGames(draft, "A", 2);
  draft = changeKohGames(draft, "B", 1);
  draft = syncWinMethodLengths(draft);
  assert.equal(draft.winMethodsA.length, 2);
  assert.equal(draft.winMethodsB.length, 1);
  assert.equal(draft.winMethodsA[0], "REGULAR");
});

test("kohScoreCanComplete for BO3", () => {
  let draft = emptyKohScoreDraft();
  draft = changeKohGames(draft, "A", 2);
  draft = changeKohGames(draft, "B", 0);
  assert.equal(
    kohScoreCanComplete(draft, { setFormat: "BO3_GAMES", gameWinBy: 1, setsToWin: 1 }),
    true
  );
  draft = emptyKohScoreDraft();
  draft = changeKohGames(draft, "A", 1);
  assert.equal(
    kohScoreCanComplete(draft, { setFormat: "BO3_GAMES", gameWinBy: 1, setsToWin: 1 }),
    false
  );
});

test("buildKohScorePayload shapes COMPLETE body", () => {
  let draft = emptyKohScoreDraft();
  draft = changeKohGames(draft, "B", 2);
  const payload = buildKohScorePayload(draft, 3, "COMPLETE");
  assert.equal(payload.status, "COMPLETE");
  assert.equal(payload.expectedVersion, 3);
  assert.equal(payload.sets[0]?.gamesB, 2);
  assert.equal(payload.sets[0]?.winMethodsB?.length, 2);
});

test("formatCourtChangeLines for PROMOTED", () => {
  const lines = formatCourtChangeLines(
    {
      type: "PROMOTED",
      fromCourtNumber: 2,
      toCourtNumber: 1,
      promotedUnitId: "p1",
      demotedUnitId: "d1"
    },
    [
      { id: "p1", playerAId: "a", playerBId: "b", playerAName: "Jordan", playerBName: "Lee" },
      { id: "d1", playerAId: "c", playerBId: "d", playerAName: "Morgan", playerBName: "Pat" }
    ]
  );
  assert.match(lines.upLine ?? "", /Jordan \/ Lee/);
  assert.match(lines.downLine ?? "", /Morgan \/ Pat/);
  assert.match(lines.body, /Got it|swaps down|Acknowledge/i);
});

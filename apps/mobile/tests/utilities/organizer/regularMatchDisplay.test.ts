import test from "node:test";
import assert from "node:assert/strict";

import {
  formatRegularMatchScore,
  formatRegularSetScore,
  regularMatchStatusLine
} from "../../../src/utilities/organizer/regularMatchDisplay";

test("formatRegularSetScore formats games and set TB", () => {
  assert.equal(formatRegularSetScore({ setNumber: 1, gamesA: 6, gamesB: 4 }), "6–4");
  assert.equal(
    formatRegularSetScore({ setNumber: 1, gamesA: 6, gamesB: 6, tbA: 7, tbB: 5 }),
    "6–6 TB 7–5"
  );
});

test("formatRegularMatchScore joins set lines and ignores empty sets", () => {
  assert.equal(formatRegularMatchScore(undefined), null);
  assert.equal(formatRegularMatchScore([]), null);
  assert.equal(
    formatRegularMatchScore([
      { setNumber: 1, gamesA: 0, gamesB: 0 },
      { setNumber: 2, gamesA: 5, gamesB: 4 }
    ]),
    "5–4"
  );
  assert.equal(
    formatRegularMatchScore([
      { setNumber: 1, gamesA: 6, gamesB: 4 },
      { setNumber: 2, gamesA: 3, gamesB: 6 }
    ]),
    "6–4, 3–6"
  );
});

test("regularMatchStatusLine labels drafts and completed matches", () => {
  assert.equal(
    regularMatchStatusLine({ completed: false, canEdit: true }).text,
    "Tap to enter score"
  );
  assert.equal(
    regularMatchStatusLine({
      sets: [{ setNumber: 1, gamesA: 5, gamesB: 4 }],
      completed: false,
      canEdit: true
    }).text,
    "5–4 · draft"
  );
  assert.equal(
    regularMatchStatusLine({
      sets: [{ setNumber: 1, gamesA: 6, gamesB: 4 }],
      completed: true,
      canEdit: true
    }).text,
    "6–4 · Done"
  );
});

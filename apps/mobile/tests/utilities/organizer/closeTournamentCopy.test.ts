import test from "node:test";
import assert from "node:assert/strict";

import {
  finishOptionDetail,
  finishPrimaryLabel,
  finishSheetMessage,
  finishSheetTitle
} from "../../../src/utilities/organizer/closeTournamentCopy";

test("title warns about closing early only when matches are unplayed", () => {
  assert.equal(finishSheetTitle(false, 0), "Finish tournament?");
  assert.equal(finishSheetTitle(true, 0), "End this Mexicano night?");
  assert.equal(finishSheetTitle(false, 4), "Close tournament early?");
  assert.equal(finishSheetTitle(true, 4), "End night early?");
});

test("message names the exact number of unplayed matches", () => {
  assert.equal(finishSheetMessage(0), "Results will be locked.");
  assert.match(finishSheetMessage(4), /^4 matches have not been played\./);
  assert.match(finishSheetMessage(1), /^1 match has not been played\./);
});

test("message explains void, keeps partial scores, and never says games", () => {
  const message = finishSheetMessage(3);
  assert.match(message, /void/i);
  assert.match(message, /standings/i);
  assert.match(message, /account leaderboard/i);
  assert.match(message, /Scores already entered are kept/i);
  // Match > Set > Game: this count is matches, so the copy must not say "games".
  assert.doesNotMatch(message, /\bgames?\b/i);
});

test("primary label switches to a destructive close when voiding", () => {
  assert.equal(finishPrimaryLabel(false, 0), "Finish");
  assert.equal(finishPrimaryLabel(true, 0), "End night");
  assert.equal(finishPrimaryLabel(false, 2), "Close and void");
  assert.equal(finishPrimaryLabel(true, 2), "Close and void");
});

test("option detail reports the void count and pluralises", () => {
  assert.equal(finishOptionDetail(false, 3), "Already ended");
  assert.equal(finishOptionDetail(true, 0), "Lock results");
  assert.equal(finishOptionDetail(true, 1), "Void 1 unplayed match");
  assert.equal(finishOptionDetail(true, 5), "Void 5 unplayed matches");
});

test("no copy path tells the organizer to score everything first", () => {
  const all = [
    finishSheetTitle(false, 0),
    finishSheetTitle(false, 2),
    finishSheetMessage(0),
    finishSheetMessage(2),
    finishOptionDetail(true, 0),
    finishOptionDetail(true, 2)
  ].join(" ");
  assert.doesNotMatch(all, /score all matches first/i);
  assert.doesNotMatch(all, /discard/i);
});

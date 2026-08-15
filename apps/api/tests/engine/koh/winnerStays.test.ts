import assert from "node:assert/strict";
import test from "node:test";

import {
  applyKohMatchResult,
  challengerOf,
  kingOf,
  shuffleQueueOnce,
  waitingOf,
  type KohEngineCourt,
  type KohEngineUnit
} from "../../../src/engine/koh/index.js";

function unit(id: string, overrides: Partial<KohEngineUnit> = {}): KohEngineUnit {
  return {
    id,
    playerAId: `${id}-a`,
    playerBId: `${id}-b`,
    matchesWon: 0,
    matchesLost: 0,
    kingWinStreak: 0,
    ...overrides
  };
}

function court(queue: KohEngineUnit[]): KohEngineCourt {
  return { id: "court-1", courtNumber: 1, queue };
}

test("king win sends challenger to end of FIFO", () => {
  const before = court([unit("k"), unit("c"), unit("w1"), unit("w2")]);
  const { court: after, event } = applyKohMatchResult(before, "k");
  assert.equal(event.type, "KING_WIN");
  assert.equal(kingOf(after)?.id, "k");
  assert.equal(challengerOf(after)?.id, "w1");
  assert.deepEqual(
    waitingOf(after).map((u) => u.id),
    ["w2", "c"]
  );
  assert.equal(kingOf(after)?.kingWinStreak, 1);
  assert.equal(kingOf(after)?.matchesWon, 1);
});

test("king loss swaps slots; old king goes to back", () => {
  const before = court([unit("k"), unit("c"), unit("w1")]);
  const { court: after, event } = applyKohMatchResult(before, "c");
  assert.equal(event.type, "KING_LOSS");
  assert.equal(kingOf(after)?.id, "c");
  assert.equal(challengerOf(after)?.id, "w1");
  assert.deepEqual(
    waitingOf(after).map((u) => u.id),
    ["k"]
  );
  assert.equal(kingOf(after)?.kingWinStreak, 1);
  assert.equal(kingOf(after)?.matchesWon, 1);
});

test("two-unit court still rotates on king win", () => {
  const before = court([unit("k"), unit("c")]);
  const { court: after } = applyKohMatchResult(before, "k");
  assert.equal(kingOf(after)?.id, "k");
  assert.equal(challengerOf(after)?.id, "c");
  assert.equal(waitingOf(after).length, 0);
});

test("shuffleQueueOnce reorders without dropping units", () => {
  const before = court([unit("a"), unit("b"), unit("c"), unit("d")]);
  let i = 0;
  const sequence = [0.9, 0.1, 0.5, 0.2];
  const after = shuffleQueueOnce(before, () => sequence[i++] ?? 0);
  assert.equal(after.queue.length, 4);
  assert.deepEqual(
    [...after.queue.map((u) => u.id)].sort(),
    ["a", "b", "c", "d"]
  );
});

test("applyKohMatchResult rejects winner not on court", () => {
  const before = court([unit("k"), unit("c")]);
  assert.throws(() => applyKohMatchResult(before, "w1"));
});

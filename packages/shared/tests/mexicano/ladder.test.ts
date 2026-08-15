import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMexicanoLadderAssignments,
  sortMexicanoStandings
} from "../../src/mexicano/ladder.js";

test("sortMexicanoStandings orders by points then games then id", () => {
  const sorted = sortMexicanoStandings([
    { playerId: "b", totalPoints: 10, gamesPlayed: 1 },
    { playerId: "a", totalPoints: 20, gamesPlayed: 1 },
    { playerId: "c", totalPoints: 10, gamesPlayed: 2 },
    { playerId: "d", totalPoints: 10, gamesPlayed: 2 }
  ]);
  assert.deepEqual(
    sorted.map((row) => row.playerId),
    ["a", "c", "d", "b"]
  );
});

test("8-player table maps to 1+3 vs 2+4 and 5+7 vs 6+8", () => {
  const ids = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
  const { courts, sittingOut } = buildMexicanoLadderAssignments(ids, 2);
  assert.equal(sittingOut.length, 0);
  assert.deepEqual(courts, [
    { court: 1, teamA: ["p1", "p3"], teamB: ["p2", "p4"] },
    { court: 2, teamA: ["p5", "p7"], teamB: ["p6", "p8"] }
  ]);
});

test("12-player table maps three courts", () => {
  const ids = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
  const { courts, sittingOut } = buildMexicanoLadderAssignments(ids, 3);
  assert.equal(sittingOut.length, 0);
  assert.equal(courts.length, 3);
  assert.deepEqual(courts[0], { court: 1, teamA: ["p1", "p3"], teamB: ["p2", "p4"] });
  assert.deepEqual(courts[1], { court: 2, teamA: ["p5", "p7"], teamB: ["p6", "p8"] });
  assert.deepEqual(courts[2], { court: 3, teamA: ["p9", "p11"], teamB: ["p10", "p12"] });
});

test("10 players and 2 courts leaves two sitting out", () => {
  const ids = Array.from({ length: 10 }, (_, i) => `p${i + 1}`);
  const { courts, sittingOut } = buildMexicanoLadderAssignments(ids, 2);
  assert.equal(courts.length, 2);
  assert.deepEqual(sittingOut, ["p9", "p10"]);
});

test("maxCourts truncates even when more groups of four exist", () => {
  const ids = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
  const { courts, sittingOut } = buildMexicanoLadderAssignments(ids, 2);
  assert.equal(courts.length, 2);
  assert.deepEqual(sittingOut, ["p9", "p10", "p11", "p12"]);
});

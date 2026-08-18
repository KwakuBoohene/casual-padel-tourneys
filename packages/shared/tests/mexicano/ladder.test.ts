import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMexicanoLadderAssignments,
  buildMexicanoTeamLadderAssignments,
  selectMexicanoRoundUnits,
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

test("team ladder maps 1 vs 2 and 3 vs 4", () => {
  const { courts, sittingOut } = buildMexicanoTeamLadderAssignments(
    ["t1", "t2", "t3", "t4"],
    2
  );
  assert.equal(sittingOut.length, 0);
  assert.deepEqual(courts, [
    { court: 1, teamAId: "t1", teamBId: "t2" },
    { court: 2, teamAId: "t3", teamBId: "t4" }
  ]);
});

test("5 teams leaves one sitting out", () => {
  const { courts, sittingOut } = buildMexicanoTeamLadderAssignments(
    ["t1", "t2", "t3", "t4", "t5"],
    3
  );
  assert.equal(courts.length, 2);
  assert.deepEqual(sittingOut, ["t5"]);
});

test("selectMexicanoRoundUnits is plain standings order when games are level", () => {
  const rows = [
    { playerId: "p3", totalPoints: 10, gamesPlayed: 1 },
    { playerId: "p1", totalPoints: 30, gamesPlayed: 1 },
    { playerId: "p2", totalPoints: 20, gamesPlayed: 1 },
    { playerId: "p4", totalPoints: 5, gamesPlayed: 1 }
  ];
  const { playing, sittingOut } = selectMexicanoRoundUnits(rows, 4);
  assert.deepEqual(
    playing.map((row) => row.playerId),
    ["p1", "p2", "p3", "p4"]
  );
  assert.equal(sittingOut.length, 0);
});

test("selectMexicanoRoundUnits brings in whoever has played least", () => {
  const rows = [
    { playerId: "played", totalPoints: 40, gamesPlayed: 1 },
    { playerId: "rested-low", totalPoints: 0, gamesPlayed: 0 },
    { playerId: "rested-high", totalPoints: 0, gamesPlayed: 0 },
    { playerId: "played-2", totalPoints: 30, gamesPlayed: 1 },
    { playerId: "played-3", totalPoints: 20, gamesPlayed: 1 }
  ];
  const { playing, sittingOut } = selectMexicanoRoundUnits(rows, 4);
  const ids = new Set(playing.map((row) => row.playerId));
  assert.equal(ids.has("rested-low"), true);
  assert.equal(ids.has("rested-high"), true);
  assert.deepEqual(
    sittingOut.map((row) => row.playerId),
    ["played-3"]
  );
});

test("selectMexicanoRoundUnits splits a 16-player field into halves", () => {
  const rows = Array.from({ length: 16 }, (_, i) => ({
    playerId: `p${i + 1}`,
    totalPoints: 100 - i,
    gamesPlayed: i < 8 ? 1 : 0
  }));
  const { playing } = selectMexicanoRoundUnits(rows, 8);
  assert.deepEqual(
    playing.map((row) => row.playerId),
    ["p9", "p10", "p11", "p12", "p13", "p14", "p15", "p16"]
  );
});

test("selectMexicanoRoundUnits clamps to the number of units available", () => {
  const rows = Array.from({ length: 3 }, (_, i) => ({
    playerId: `p${i + 1}`,
    totalPoints: 0,
    gamesPlayed: 0
  }));
  const { playing, sittingOut } = selectMexicanoRoundUnits(rows, 8);
  assert.equal(playing.length, 3);
  assert.equal(sittingOut.length, 0);
});

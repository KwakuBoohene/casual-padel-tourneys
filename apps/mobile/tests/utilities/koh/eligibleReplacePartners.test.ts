import assert from "node:assert/strict";
import test from "node:test";

import type { KohTournamentHub } from "../../../src/types/koh/create";
import { eligibleReplacePartners } from "../../../src/utilities/koh/eligibleReplacePartners";

function unit(
  id: string,
  aId: string,
  aName: string,
  bId: string,
  bName: string
): KohTournamentHub["courts"][number]["king"] {
  return {
    id,
    playerAId: aId,
    playerAName: aName,
    playerBId: bId,
    playerBName: bName,
    matchesWon: 0,
    matchesLost: 0
  } as KohTournamentHub["courts"][number]["king"];
}

test("eligibleReplacePartners excludes leave and stay, includes other courts", () => {
  const hub = {
    courts: [
      {
        id: "c1",
        courtNumber: 1,
        king: unit("u1", "a", "KingA", "b", "KingB"),
        challenger: unit("u2", "c", "ChalA", "d", "ChalB"),
        waiting: [unit("u3", "e", "WaitA", "f", "WaitB")],
        activeMatch: null
      },
      {
        id: "c2",
        courtNumber: 2,
        king: unit("u4", "g", "C2A", "h", "C2B"),
        challenger: null,
        waiting: [],
        activeMatch: null
      }
    ]
  } as unknown as KohTournamentHub;

  const rows = eligibleReplacePartners(hub, "b", "a", 1);
  const ids = rows.map((row) => row.playerId);
  assert.equal(ids.includes("a"), false);
  assert.equal(ids.includes("b"), false);
  assert.ok(ids.includes("c"));
  assert.ok(ids.includes("g"));
  assert.equal(rows.find((row) => row.playerId === "c")?.sameCourt, true);
  assert.equal(rows.find((row) => row.playerId === "g")?.sameCourt, false);
});

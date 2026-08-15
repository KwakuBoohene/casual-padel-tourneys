import test from "node:test";
import assert from "node:assert/strict";

import { sortKohRankings } from "../../../src/engine/koh/rankings.js";

function unit(
  id: string,
  opts: {
    matchesWon: number;
    matchesLost: number;
    specialLosses?: number;
    gamesWon?: number;
    gamesLost?: number;
  }
) {
  return {
    id,
    playerAId: `${id}-a`,
    playerBId: `${id}-b`,
    matchesWon: opts.matchesWon,
    matchesLost: opts.matchesLost,
    kingWinStreak: 0,
    specialLosses: opts.specialLosses ?? 0,
    courtNumber: 1,
    gamesWon: opts.gamesWon ?? 0,
    gamesLost: opts.gamesLost ?? 0
  };
}

test("sortKohRankings: W–L first, then special losses, then game diff", () => {
  const sorted = sortKohRankings([
    unit("low", { matchesWon: 1, matchesLost: 3, specialLosses: 5, gamesWon: 10, gamesLost: 20 }),
    unit("top", { matchesWon: 4, matchesLost: 1, specialLosses: 0, gamesWon: 20, gamesLost: 10 }),
    unit("tiedMoreSpecial", {
      matchesWon: 2,
      matchesLost: 2,
      specialLosses: 3,
      gamesWon: 12,
      gamesLost: 12
    }),
    unit("tiedLessSpecial", {
      matchesWon: 2,
      matchesLost: 2,
      specialLosses: 1,
      gamesWon: 15,
      gamesLost: 10
    })
  ]);

  assert.deepEqual(
    sorted.map((row) => row.id),
    ["top", "tiedMoreSpecial", "tiedLessSpecial", "low"]
  );
});

test("sortKohRankings: game differential breaks remaining ties", () => {
  const sorted = sortKohRankings([
    unit("minus", { matchesWon: 1, matchesLost: 1, specialLosses: 0, gamesWon: 5, gamesLost: 10 }),
    unit("plus", { matchesWon: 1, matchesLost: 1, specialLosses: 0, gamesWon: 12, gamesLost: 8 })
  ]);
  assert.equal(sorted[0]?.id, "plus");
  assert.equal(sorted[1]?.id, "minus");
});

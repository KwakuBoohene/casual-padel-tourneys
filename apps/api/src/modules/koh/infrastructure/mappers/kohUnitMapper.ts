import type { KohLastResult, KohTempSwap, KohUnit } from "@padel/shared";

export function mapUnit(row: {
  id: string;
  playerAId: string;
  playerBId: string;
  playerA: { name: string };
  playerB: { name: string };
  matchesWon?: number;
  matchesLost?: number;
}): KohUnit {
  return {
    id: row.id,
    playerAId: row.playerAId,
    playerBId: row.playerBId,
    playerAName: row.playerA.name,
    playerBName: row.playerB.name,
    matchesWon: row.matchesWon ?? 0,
    matchesLost: row.matchesLost ?? 0
  };
}

export function mapTempSwap(row: {
  tempSwapSlot: string | null;
  tempSwapInUnitId: string | null;
  tempSwapOutUnitId: string | null;
  tempSwapReason: string | null;
}): KohTempSwap | null {
  if (
    (row.tempSwapSlot !== "KING" && row.tempSwapSlot !== "CHALLENGER") ||
    !row.tempSwapInUnitId ||
    !row.tempSwapOutUnitId ||
    !row.tempSwapReason
  ) {
    return null;
  }
  return {
    slot: row.tempSwapSlot,
    inUnitId: row.tempSwapInUnitId,
    outUnitId: row.tempSwapOutUnitId,
    reason: row.tempSwapReason
  };
}

export function mapLastResult(
  matches: Array<{
    completed: boolean;
    sets: Array<{
      gamesA: number;
      gamesB: number;
      winMethodsA: Array<"REGULAR" | "GOLDEN" | "STAR">;
      winMethodsB: Array<"REGULAR" | "GOLDEN" | "STAR">;
    }>;
  }>
): KohLastResult | null {
  const completed = matches.find((match) => match.completed);
  if (!completed || completed.sets.length === 0) {
    return null;
  }
  let gamesA = 0;
  let gamesB = 0;
  let hadGolden = false;
  let hadStar = false;
  for (const set of completed.sets) {
    gamesA += set.gamesA;
    gamesB += set.gamesB;
    for (const method of [...set.winMethodsA, ...set.winMethodsB]) {
      if (method === "GOLDEN") hadGolden = true;
      if (method === "STAR") hadStar = true;
    }
  }
  const hadSpecialFinish = hadGolden || hadStar;
  return {
    gamesA,
    gamesB,
    hadSpecialFinish,
    specialLabel: hadStar ? "Star" : hadGolden ? "Golden" : undefined
  };
}

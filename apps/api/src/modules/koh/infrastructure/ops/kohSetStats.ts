import type { SubmitKohScoreInput } from "@padel/shared";
import { createId } from "@padel/shared";

import { prisma } from "../../../../lib/prisma.js";

function isSpecialMethod(method: "REGULAR" | "GOLDEN" | "STAR"): boolean {
  return method === "GOLDEN" || method === "STAR";
}

/** Games + golden/star losses for side A / B from submitted sets. */
export function tallyKohSetStats(sets: SubmitKohScoreInput["sets"]): {
  gamesA: number;
  gamesB: number;
  specialLossA: number;
  specialLossB: number;
} {
  let gamesA = 0;
  let gamesB = 0;
  let specialLossA = 0;
  let specialLossB = 0;
  for (const set of sets) {
    gamesA += set.gamesA;
    gamesB += set.gamesB;
    specialLossA += (set.winMethodsB ?? []).filter(isSpecialMethod).length;
    specialLossB += (set.winMethodsA ?? []).filter(isSpecialMethod).length;
  }
  return { gamesA, gamesB, specialLossA, specialLossB };
}

export function kohSetRows(matchId: string, sets: SubmitKohScoreInput["sets"]) {
  return sets.map((set) => ({
    id: createId("kohset"),
    matchId,
    setNumber: set.setNumber,
    gamesA: set.gamesA,
    gamesB: set.gamesB,
    tbA: set.tbA ?? null,
    tbB: set.tbB ?? null,
    winMethodsA: set.winMethodsA ?? [],
    winMethodsB: set.winMethodsB ?? []
  }));
}

export async function replaceMatchSets(
  matchId: string,
  sets: SubmitKohScoreInput["sets"]
): Promise<void> {
  await prisma.kohMatchSet.deleteMany({ where: { matchId } });
  await prisma.kohMatchSet.createMany({ data: kohSetRows(matchId, sets) });
}

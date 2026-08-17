import type { KohGameWinMethod, MatchSet, RegularScoringConfig } from "@padel/shared";
import { allowsSpecialWinMethods, resolveDeuceMode } from "@padel/shared";

function padMethods(methods: KohGameWinMethod[] | undefined, count: number): KohGameWinMethod[] {
  const next = (methods ?? []).slice(0, count);
  while (next.length < count) next.push("REGULAR");
  return next;
}

export function padSetWinMethods(set: MatchSet): MatchSet {
  return {
    ...set,
    winMethodsA: padMethods(set.winMethodsA, set.gamesA),
    winMethodsB: padMethods(set.winMethodsB, set.gamesB)
  };
}

export function padMatchWinMethods(sets: MatchSet[]): MatchSet[] {
  return sets.map(padSetWinMethods);
}

export function setGameWinMethod(
  sets: MatchSet[],
  setIndex: number,
  side: "A" | "B",
  gameIndex: number,
  method: KohGameWinMethod
): MatchSet[] {
  return padMatchWinMethods(sets).map((set, index) => {
    if (index !== setIndex) return set;
    const key = side === "A" ? "winMethodsA" : "winMethodsB";
    const methods = [...(set[key] ?? [])];
    methods[gameIndex] = method;
    return { ...set, [key]: methods };
  });
}

export function needsWinMethodPrompt(config: RegularScoringConfig | null | undefined): boolean {
  if (!config) return false;
  return allowsSpecialWinMethods(resolveDeuceMode(config));
}

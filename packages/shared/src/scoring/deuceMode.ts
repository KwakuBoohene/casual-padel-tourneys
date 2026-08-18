import type { DeuceMode, KohGameWinMethod, MatchSet, RegularScoringConfig } from "../types/domain.js";

/**
 * Legacy fallback for payloads saved before `deuceMode` existed: win-by-2 reads as Advantage and
 * win-by-1 as Golden (not Star). Never use this to pick a set margin — see `setMargin.ts`.
 */
export function resolveDeuceMode(config: Pick<RegularScoringConfig, "gameWinBy" | "deuceMode">): DeuceMode {
  if (config.deuceMode) {
    return config.deuceMode;
  }
  return config.gameWinBy === 1 ? "GOLDEN" : "ADVANTAGE";
}

export function deuceModeLabel(mode: DeuceMode): string {
  if (mode === "ADVANTAGE") return "Advantage";
  if (mode === "GOLDEN") return "Golden point";
  return "Star point";
}

export function allowsSpecialWinMethods(mode: DeuceMode): boolean {
  return mode === "GOLDEN" || mode === "STAR";
}

export function hasWinMethodPayload(
  sets: Array<{ winMethodsA?: unknown[]; winMethodsB?: unknown[] }>
): boolean {
  return sets.some(
    (set) => (set.winMethodsA?.length ?? 0) > 0 || (set.winMethodsB?.length ?? 0) > 0
  );
}

export function specialPointLabelForSet(set: MatchSet): "Golden" | "Star" | null {
  const methods: KohGameWinMethod[] = [...(set.winMethodsA ?? []), ...(set.winMethodsB ?? [])];
  if (methods.includes("STAR")) return "Star";
  if (methods.includes("GOLDEN")) return "Golden";
  return null;
}

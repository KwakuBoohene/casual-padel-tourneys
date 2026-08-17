import type { MatchSet, RegularScoringConfig } from "@padel/shared";
import { evaluateMatch, evaluateSet } from "@padel/shared";

import type { RegularEntrySnapshot } from "./regularScoreEntry";
import { currentSetIndex } from "./regularScoreEntry";

export function currentSetIsComplete(sets: MatchSet[], config: RegularScoringConfig): boolean {
  const set = sets[currentSetIndex(sets, config)];
  return Boolean(set && evaluateSet(set, config).complete);
}

export function canStartNextSet(sets: MatchSet[], config: RegularScoringConfig): boolean {
  if (!currentSetIsComplete(sets, config)) return false;
  return !evaluateMatch(sets, config).complete;
}

export function beginNextRegularSet(
  snapshot: RegularEntrySnapshot,
  config: RegularScoringConfig
): RegularEntrySnapshot | null {
  if (!canStartNextSet(snapshot.sets, config)) return null;
  return {
    ...snapshot,
    sets: [
      ...snapshot.sets.map((set) => ({ ...set })),
      { setNumber: snapshot.sets.length + 1, gamesA: 0, gamesB: 0 }
    ]
  };
}

export type RegularPrimaryAction = "DRAFT" | "NEXT_SET" | "COMPLETE";

export function regularPrimaryAction(
  sets: MatchSet[],
  config: RegularScoringConfig,
  matchTb?: { a?: number; b?: number }
): RegularPrimaryAction {
  if (!currentSetIsComplete(sets, config)) return "DRAFT";
  if (evaluateMatch(sets, config, matchTb).complete) return "COMPLETE";
  return "NEXT_SET";
}

export function regularScorePrimaryLabel(
  action: RegularPrimaryAction | null,
  needsMethods: boolean
): string {
  if (!action || action === "DRAFT") return "Save draft";
  if (action === "NEXT_SET") return "Next set";
  return needsMethods ? "Next" : "Complete match";
}

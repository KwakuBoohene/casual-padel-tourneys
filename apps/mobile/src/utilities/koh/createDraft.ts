import { KOH_MAX_UNITS_PER_COURT } from "@padel/shared";

import type { KohCreateDraft, KohDraftCourt, KohDraftPromoRule, KohDraftUnit } from "../../types/koh/create";

export function createEmptyDraft(): KohCreateDraft {
  return {
    name: "",
    pairingMode: "WINNER_STAYS",
    matchFormat: "BO3_GAMES",
    deuceMode: "GOLDEN",
    courts: 1,
    promoRules: [],
    courtUnits: [{ courtNumber: 1, units: [] }],
    assignCourtIndex: 0,
    selectedUnitId: null,
    contributeToCareerLeaderboard: true
  };
}

export function syncCourts(draft: KohCreateDraft, courts: number): KohCreateDraft {
  const nextCourts = Math.max(1, Math.min(8, courts));
  const courtUnits: KohDraftCourt[] = [];
  for (let n = 1; n <= nextCourts; n += 1) {
    const existing = draft.courtUnits.find((court) => court.courtNumber === n);
    courtUnits.push(existing ?? { courtNumber: n, units: [] });
  }
  const promoRules: KohDraftPromoRule[] = [];
  for (let n = 2; n <= nextCourts; n += 1) {
    const existing = draft.promoRules.find((rule) => rule.courtNumber === n);
    promoRules.push(
      existing ?? {
        courtNumber: n,
        enabled: true,
        winsRequired: n === 2 ? 4 : 3
      }
    );
  }
  return {
    ...draft,
    courts: nextCourts,
    courtUnits,
    promoRules,
    assignCourtIndex: Math.min(draft.assignCourtIndex, nextCourts - 1),
    selectedUnitId: null
  };
}

export function balanceHintForCounts(counts: number[]): string | null {
  if (counts.length === 0) return null;
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (max - min > 1) {
    return "Court sizes differ by more than 1 — rebalance if possible.";
  }
  return null;
}

export function canAddPair(court: KohDraftCourt): boolean {
  return court.units.length < KOH_MAX_UNITS_PER_COURT;
}

export function validatePairNames(playerAName: string, playerBName: string): string | null {
  const a = playerAName.trim();
  const b = playerBName.trim();
  if (!a || !b) return "Both player names are required.";
  if (a.toLowerCase() === b.toLowerCase()) return "A pair needs two different players.";
  return null;
}

export function collectAllPlayerNames(courtUnits: KohDraftCourt[]): string[] {
  const names: string[] = [];
  for (const court of courtUnits) {
    for (const unit of court.units) {
      names.push(unit.playerAName.trim(), unit.playerBName.trim());
    }
  }
  return names;
}

export function hasDuplicatePlayerNames(courtUnits: KohDraftCourt[]): boolean {
  const names = collectAllPlayerNames(courtUnits).map((name) => name.toLowerCase());
  return new Set(names).size !== names.length;
}

export function courtsReadyToStart(courtUnits: KohDraftCourt[]): boolean {
  return courtUnits.length > 0 && courtUnits.every((court) => court.units.length >= 2);
}

export function shuffleCourtUnits(units: KohDraftUnit[], random = Math.random): KohDraftUnit[] {
  const next = [...units];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

export function unitRoleLabel(index: number): "KING" | "NEXT" | "WAIT" {
  if (index === 0) return "KING";
  if (index === 1) return "NEXT";
  return "WAIT";
}

export function newDraftUnitId(): string {
  return `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

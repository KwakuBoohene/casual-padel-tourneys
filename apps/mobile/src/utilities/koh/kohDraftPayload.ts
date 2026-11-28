import type { DraftReadiness, KohDraftPayload } from "@padel/shared";

import type { KohCreateDraft, KohCreateStep, KohMatchFormatChoice } from "../../types/koh/create";

import { createEmptyDraft, newDraftUnitId, syncCourts } from "./createDraft";
import { buildCreatePayload } from "./createPayload";

const FORMATS: KohMatchFormatChoice[] = ["FULL_SET", "BO3_GAMES", "BO5_GAMES"];

/**
 * KOH wizard state → draft payload. Scoring and promotion use the same mapping as a direct
 * create, so starting the draft creates exactly what the wizard would have. Names stay untrimmed
 * (blank pairs are dropped on start).
 */
export function toKohDraftPayload(state: KohCreateDraft): KohDraftPayload {
  const create = buildCreatePayload(state);
  const payload: KohDraftPayload = {
    name: state.name,
    mode: "KING_OF_THE_COURT",
    pairingMode: state.pairingMode,
    courts: state.courts,
    regularScoring: create.regularScoring,
    contributeToCareerLeaderboard: state.contributeToCareerLeaderboard,
    courtAssignments: state.courtUnits.map((court) => ({
      courtNumber: court.courtNumber,
      units: court.units.map((unit) => ({ playerA: { name: unit.playerAName }, playerB: { name: unit.playerBName } }))
    }))
  };
  if (create.promotionRules) payload.promotionRules = create.promotionRules;
  return payload;
}

/**
 * Draft payload → KOH wizard state. Promotion rules listed in the payload come back switched on.
 * Courts without a rule come back off, unless the payload had no rules (then the wizard defaults).
 */
export function fromKohDraftPayload(payload: KohDraftPayload): KohCreateDraft {
  const base = syncCourts(createEmptyDraft(), payload.courts ?? 1);
  const setFormat = payload.regularScoring?.setFormat as KohMatchFormatChoice | undefined;
  const rules = payload.promotionRules ?? [];
  const promoRules = base.promoRules.map((rule) => {
    const saved = rules.find((entry) => entry.courtNumber === rule.courtNumber);
    if (saved) return { ...rule, enabled: true, winsRequired: saved.winsRequired };
    return rules.length > 0 ? { ...rule, enabled: false } : rule;
  });
  const courtUnits = base.courtUnits.map((court) => ({
    courtNumber: court.courtNumber,
    units: (payload.courtAssignments?.find((entry) => entry.courtNumber === court.courtNumber)?.units ?? []).map(
      (unit) => ({ id: newDraftUnitId(), playerAName: unit.playerA.name, playerBName: unit.playerB.name })
    )
  }));
  return {
    ...base,
    name: payload.name ?? "",
    matchFormat: setFormat && FORMATS.includes(setFormat) ? setFormat : base.matchFormat,
    deuceMode: payload.regularScoring?.deuceMode ?? base.deuceMode,
    promoRules,
    courtUnits,
    contributeToCareerLeaderboard: payload.contributeToCareerLeaderboard ?? true
  };
}

/** First KOH step the readiness check flags; Review when it's ready. */
export function kohResumeStep(readiness: DraftReadiness): KohCreateStep {
  const missing = readiness.items.find((item) => item.status === "missing")?.key;
  if (missing === "name") return "NAME";
  if (missing === "scoring") return "FORMAT";
  if (missing === "courts") return "COURTS";
  if (missing === "players") return "ASSIGN";
  return readiness.ready ? "REVIEW" : "NAME";
}

export function hasKohDraftContent(state: KohCreateDraft): boolean {
  return state.name.trim().length > 0 || state.courtUnits.some((court) => court.units.length > 0);
}

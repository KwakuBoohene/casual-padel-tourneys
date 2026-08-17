import type { AssignKohCourtsInput, CreateKohTournamentInput } from "@padel/shared";

import type { KohCreateDraft } from "../../types/koh/create";
import { regularScoringFromDraft } from "./regularScoringFromDraft";

export function buildCreatePayload(draft: KohCreateDraft): CreateKohTournamentInput {
  const regularScoring = regularScoringFromDraft(draft.matchFormat, draft.deuceMode);
  const enabledRules = draft.promoRules
    .filter((rule) => rule.enabled)
    .map((rule) => ({
      courtNumber: rule.courtNumber,
      winsRequired: rule.winsRequired
    }));

  const promotionRules =
    draft.courts <= 1
      ? undefined
      : enabledRules.length > 0
        ? enabledRules
        : draft.promoRules.map((rule) => ({
            courtNumber: rule.courtNumber,
            winsRequired: rule.winsRequired
          }));

  return {
    name: draft.name.trim(),
    mode: "KING_OF_THE_COURT",
    pairingMode: "WINNER_STAYS",
    courts: draft.courts,
    regularScoring,
    promotionRules
  };
}

export function buildAssignPayload(draft: KohCreateDraft): AssignKohCourtsInput {
  return {
    courts: draft.courtUnits.map((court) => ({
      courtNumber: court.courtNumber,
      units: court.units.map((unit) => ({
        playerA: { name: unit.playerAName.trim() },
        playerB: { name: unit.playerBName.trim() }
      }))
    }))
  };
}

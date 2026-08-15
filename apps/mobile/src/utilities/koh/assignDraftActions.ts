import type { KohCreateDraft } from "../../types/koh/create";
import {
  canAddPair,
  hasDuplicatePlayerNames,
  newDraftUnitId,
  shuffleCourtUnits,
  validatePairNames
} from "../../utilities/koh/createDraft";

export function addPairToActiveCourt(
  draft: KohCreateDraft,
  playerAName: string,
  playerBName: string
): { draft: KohCreateDraft; error: string | null } {
  const activeCourt = draft.courtUnits[draft.assignCourtIndex];
  const nameError = validatePairNames(playerAName, playerBName);
  if (nameError) return { draft, error: nameError };
  if (!activeCourt || !canAddPair(activeCourt)) {
    return { draft, error: "This court is full (max 12 pairs)." };
  }
  const unit = {
    id: newDraftUnitId(),
    playerAName: playerAName.trim(),
    playerBName: playerBName.trim()
  };
  const courtUnits = draft.courtUnits.map((court) =>
    court.courtNumber === activeCourt.courtNumber
      ? { ...court, units: [...court.units, unit] }
      : court
  );
  if (hasDuplicatePlayerNames(courtUnits)) {
    return { draft, error: "That player is already on a court." };
  }
  return {
    draft: { ...draft, courtUnits, selectedUnitId: unit.id },
    error: null
  };
}

export function randomizeActiveCourtUnits(draft: KohCreateDraft): KohCreateDraft {
  const activeCourt = draft.courtUnits[draft.assignCourtIndex];
  if (!activeCourt || activeCourt.units.length < 2) return draft;
  return {
    ...draft,
    courtUnits: draft.courtUnits.map((court) =>
      court.courtNumber === activeCourt.courtNumber
        ? { ...court, units: shuffleCourtUnits(court.units) }
        : court
    ),
    selectedUnitId: null
  };
}

export function moveSelectedUnit(draft: KohCreateDraft, direction: -1 | 1): KohCreateDraft {
  const activeCourt = draft.courtUnits[draft.assignCourtIndex];
  if (!activeCourt || !draft.selectedUnitId) return draft;
  const index = activeCourt.units.findIndex((unit) => unit.id === draft.selectedUnitId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= activeCourt.units.length) return draft;
  const units = [...activeCourt.units];
  const tmp = units[index];
  units[index] = units[target];
  units[target] = tmp;
  return {
    ...draft,
    courtUnits: draft.courtUnits.map((court) =>
      court.courtNumber === activeCourt.courtNumber ? { ...court, units } : court
    )
  };
}

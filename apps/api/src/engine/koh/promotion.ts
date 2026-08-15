import type {
  KohEngineCourt,
  KohEnginePromotionRule,
  KohEngineUnit,
  KohPromotionNotify
} from "./types.js";

function cloneUnit(unit: KohEngineUnit): KohEngineUnit {
  return { ...unit, specialLosses: unit.specialLosses ?? 0 };
}

function cloneCourt(court: KohEngineCourt): KohEngineCourt {
  return {
    id: court.id,
    courtNumber: court.courtNumber,
    queue: court.queue.map(cloneUnit)
  };
}

function cloneCourts(courts: KohEngineCourt[]): KohEngineCourt[] {
  return courts.map(cloneCourt);
}

/**
 * Weakest on a court for demotion:
 * 1) lower match W–L differential (wins - losses)
 * 2) more special (golden/star) losses ranks weaker
 * 3) more match losses
 * Ties → multiple candidates (organizer pick).
 */
export function findWeakestCandidates(court: KohEngineCourt): KohEngineUnit[] {
  if (court.queue.length === 0) {
    return [];
  }
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestSpecial = Number.NEGATIVE_INFINITY;
  let bestLosses = Number.NEGATIVE_INFINITY;
  const ranked = court.queue.map((unit) => {
    const diff = unit.matchesWon - unit.matchesLost;
    const special = unit.specialLosses ?? 0;
    return { unit, diff, special, losses: unit.matchesLost };
  });

  for (const row of ranked) {
    if (row.diff < bestDiff) {
      bestDiff = row.diff;
      bestSpecial = row.special;
      bestLosses = row.losses;
    } else if (row.diff === bestDiff) {
      if (row.special > bestSpecial) {
        bestSpecial = row.special;
        bestLosses = row.losses;
      } else if (row.special === bestSpecial && row.losses > bestLosses) {
        bestLosses = row.losses;
      }
    }
  }

  return ranked
    .filter((row) => row.diff === bestDiff && row.special === bestSpecial && row.losses === bestLosses)
    .map((row) => row.unit);
}

function removeUnit(court: KohEngineCourt, unitId: string): KohEngineUnit {
  const index = court.queue.findIndex((unit) => unit.id === unitId);
  if (index < 0) {
    throw new Error(`Unit ${unitId} not found on court ${court.courtNumber}.`);
  }
  const [removed] = court.queue.splice(index, 1);
  return removed;
}

function appendUnit(court: KohEngineCourt, unit: KohEngineUnit): void {
  court.queue.push(unit);
}

/**
 * After a match result on `fromCourt`, if the king’s streak meets the rule,
 * swap that king with the weakest unit on the stronger (lower-number) court.
 * Single-court / missing rule → no-op.
 */
export function maybePromote(input: {
  courts: KohEngineCourt[];
  rules: KohEnginePromotionRule[];
  fromCourtNumber: number;
}): {
  courts: KohEngineCourt[];
  notify: KohPromotionNotify | null;
} {
  const courts = cloneCourts(input.courts);
  if (courts.length <= 1) {
    return { courts, notify: null };
  }

  const fromCourt = courts.find((court) => court.courtNumber === input.fromCourtNumber);
  if (!fromCourt || fromCourt.queue.length === 0) {
    return { courts, notify: null };
  }

  const rule = input.rules.find((entry) => entry.courtNumber === input.fromCourtNumber);
  if (!rule) {
    return { courts, notify: null };
  }

  const promoteTo = rule.promoteToCourtNumber ?? rule.courtNumber - 1;
  if (promoteTo < 1 || promoteTo >= rule.courtNumber) {
    return { courts, notify: null };
  }

  const king = fromCourt.queue[0];
  if (!king || king.kingWinStreak < rule.winsRequired) {
    return { courts, notify: null };
  }

  const toCourt = courts.find((court) => court.courtNumber === promoteTo);
  if (!toCourt || toCourt.queue.length === 0) {
    return { courts, notify: null };
  }

  const candidates = findWeakestCandidates(toCourt);
  if (candidates.length === 0) {
    return { courts, notify: null };
  }

  if (candidates.length > 1) {
    return {
      courts,
      notify: {
        type: "NEEDS_ORGANIZER_PICK",
        fromCourtNumber: fromCourt.courtNumber,
        toCourtNumber: toCourt.courtNumber,
        promotedUnitId: king.id,
        candidateUnitIds: candidates.map((unit) => unit.id)
      }
    };
  }

  const demoted = candidates[0];
  const promoted = removeUnit(fromCourt, king.id);
  promoted.kingWinStreak = 0;
  const demotedUnit = removeUnit(toCourt, demoted.id);
  demotedUnit.kingWinStreak = 0;

  // Promoted pair enters stronger court at the back of the FIFO (not instant king).
  appendUnit(toCourt, promoted);
  // Demoted weakest goes to the promoting court at the back.
  appendUnit(fromCourt, demotedUnit);

  return {
    courts,
    notify: {
      type: "PROMOTED",
      fromCourtNumber: fromCourt.courtNumber,
      toCourtNumber: toCourt.courtNumber,
      promotedUnitId: promoted.id,
      demotedUnitId: demotedUnit.id
    }
  };
}

/**
 * Apply organizer choice after `maybePromote` returned `NEEDS_ORGANIZER_PICK`.
 * Promoted king leaves `fromCourt`; demoted candidate leaves `toCourt`.
 */
export function applyOrganizerPromotionPick(input: {
  courts: KohEngineCourt[];
  fromCourtNumber: number;
  toCourtNumber: number;
  promotedUnitId: string;
  demotedUnitId: string;
}): {
  courts: KohEngineCourt[];
  notify: Extract<KohPromotionNotify, { type: "PROMOTED" }>;
} {
  const courts = cloneCourts(input.courts);
  const fromCourt = courts.find((court) => court.courtNumber === input.fromCourtNumber);
  const toCourt = courts.find((court) => court.courtNumber === input.toCourtNumber);
  if (!fromCourt || !toCourt) {
    throw new Error("Promotion courts not found.");
  }
  if (!fromCourt.queue.some((unit) => unit.id === input.promotedUnitId)) {
    throw new Error("Promoted unit is no longer on the source court.");
  }
  if (!toCourt.queue.some((unit) => unit.id === input.demotedUnitId)) {
    throw new Error("Demoted unit is no longer on the destination court.");
  }

  const promoted = removeUnit(fromCourt, input.promotedUnitId);
  promoted.kingWinStreak = 0;
  const demotedUnit = removeUnit(toCourt, input.demotedUnitId);
  demotedUnit.kingWinStreak = 0;

  appendUnit(toCourt, promoted);
  appendUnit(fromCourt, demotedUnit);

  return {
    courts,
    notify: {
      type: "PROMOTED",
      fromCourtNumber: fromCourt.courtNumber,
      toCourtNumber: toCourt.courtNumber,
      promotedUnitId: promoted.id,
      demotedUnitId: demotedUnit.id
    }
  };
}

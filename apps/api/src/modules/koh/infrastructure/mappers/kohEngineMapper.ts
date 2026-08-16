import type { KohCourtChange, KohTempSwap } from "@padel/shared";

import type {
  KohEngineCourt,
  KohEngineUnit,
  KohPromotionNotify
} from "../../../../engine/koh/index.js";

export function toEngineCourt(court: {
  id: string;
  courtNumber: number;
  units: Array<{
    id: string;
    queuePosition: number;
    playerAId: string;
    playerBId: string;
    matchesWon: number;
    matchesLost: number;
    kingWinStreak: number;
    specialLosses?: number;
  }>;
}): KohEngineCourt {
  const ordered = [...court.units].sort((a, b) => a.queuePosition - b.queuePosition);
  return {
    id: court.id,
    courtNumber: court.courtNumber,
    queue: ordered.map(
      (unit): KohEngineUnit => ({
        id: unit.id,
        playerAId: unit.playerAId,
        playerBId: unit.playerBId,
        matchesWon: unit.matchesWon,
        matchesLost: unit.matchesLost,
        kingWinStreak: unit.kingWinStreak,
        specialLosses: unit.specialLosses ?? 0
      })
    )
  };
}

/** Put a temporarily swapped-in unit back where it came from after the match resolves. */
export function restoreTempSwapQueue(queue: KohEngineUnit[], temp: KohTempSwap): KohEngineUnit[] {
  const next = queue.map((unit) => ({ ...unit }));
  const slotIndex = temp.slot === "KING" ? 0 : 1;
  if (next[slotIndex]?.id !== temp.inUnitId) {
    return next;
  }
  const outIndex = next.findIndex((unit) => unit.id === temp.outUnitId);
  if (outIndex < 0) {
    return next;
  }
  const swappedIn = next[slotIndex];
  next[slotIndex] = next[outIndex];
  next[outIndex] = swappedIn;
  return next;
}

export function notifyToCourtChange(notify: KohPromotionNotify): KohCourtChange {
  if (notify.type === "PROMOTED") {
    return {
      type: "PROMOTED",
      fromCourtNumber: notify.fromCourtNumber,
      toCourtNumber: notify.toCourtNumber,
      promotedUnitId: notify.promotedUnitId,
      demotedUnitId: notify.demotedUnitId
    };
  }
  return {
    type: "NEEDS_ORGANIZER_PICK",
    fromCourtNumber: notify.fromCourtNumber,
    toCourtNumber: notify.toCourtNumber,
    promotedUnitId: notify.promotedUnitId,
    candidateUnitIds: notify.candidateUnitIds
  };
}

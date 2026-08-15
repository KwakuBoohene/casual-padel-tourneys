import type { KohEngineCourt, KohEngineUnit, KohMatchResultEvent } from "./types.js";

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

export function assertDoublesQueue(court: KohEngineCourt): void {
  if (court.queue.length < 2) {
    throw new Error("KOH court needs at least two doubles units (king + challenger).");
  }
}

/** Fisher–Yates shuffle; returns a new court with reordered queue (caller assigns king = [0]). */
export function shuffleQueueOnce(court: KohEngineCourt, random: () => number = Math.random): KohEngineCourt {
  const next = cloneCourt(court);
  const queue = next.queue;
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = queue[i];
    queue[i] = queue[j];
    queue[j] = tmp;
  }
  for (const unit of queue) {
    unit.kingWinStreak = 0;
  }
  return next;
}

/**
 * Apply a completed KOH match on one court.
 * - King wins → challenger goes to end of FIFO; king streak ++; waiting[0] becomes next challenger.
 * - King loses → swap king/challenger; old king sits at end; new king streak = 1.
 */
export function applyKohMatchResult(
  court: KohEngineCourt,
  winnerUnitId: string
): { court: KohEngineCourt; event: KohMatchResultEvent } {
  assertDoublesQueue(court);
  const next = cloneCourt(court);
  const king = next.queue[0];
  const challenger = next.queue[1];
  if (!king || !challenger) {
    throw new Error("KOH court missing king or challenger.");
  }

  const onCourtIds = new Set([king.id, challenger.id]);
  if (!onCourtIds.has(winnerUnitId)) {
    throw new Error("winnerUnitId must be the current king or challenger.");
  }

  if (winnerUnitId === king.id) {
    king.matchesWon += 1;
    king.kingWinStreak += 1;
    challenger.matchesLost += 1;
    challenger.kingWinStreak = 0;

    const rest = next.queue.slice(2);
    next.queue = [king, ...rest, challenger];

    return {
      court: next,
      event: {
        type: "KING_WIN",
        courtId: next.id,
        winnerUnitId: king.id,
        loserUnitId: challenger.id
      }
    };
  }

  // King loses — slot swap; new king faces previous waiting first (old king to back).
  challenger.matchesWon += 1;
  challenger.kingWinStreak = 1;
  king.matchesLost += 1;
  king.kingWinStreak = 0;

  const rest = next.queue.slice(2);
  next.queue = [challenger, ...rest, king];

  return {
    court: next,
    event: {
      type: "KING_LOSS",
      courtId: next.id,
      winnerUnitId: challenger.id,
      loserUnitId: king.id
    }
  };
}

export function kingOf(court: KohEngineCourt): KohEngineUnit | null {
  return court.queue[0] ?? null;
}

export function challengerOf(court: KohEngineCourt): KohEngineUnit | null {
  return court.queue[1] ?? null;
}

export function waitingOf(court: KohEngineCourt): KohEngineUnit[] {
  return court.queue.slice(2);
}

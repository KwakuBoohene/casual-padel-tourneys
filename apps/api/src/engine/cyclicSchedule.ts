import { createId } from "@padel/shared";
import type { Match, Player, Round } from "@padel/shared";

import { findCyclicBase } from "./cyclicBase.js";
import { repeatCost } from "./repeatLedger.js";
import { worstStreaks } from "./restStreaks.js";
import type { ScheduleShape } from "./scheduleMath.js";

/** At most this many games may separate two players part-way through a cyclic schedule. */
const MAX_PREFIX_DELTA = 2;

/**
 * Builds the whole schedule from a cyclic design when the numbers allow it: every player gets a
 * multiple of four games and the courts divide evenly into the design. Returns null otherwise.
 */
export function buildCyclicRounds(players: Player[], shape: ScheduleShape): Round[] | null {
  const n = players.length;
  const courts = shape.matchesPerRound;
  if (n < 4 || shape.totalMatches % n !== 0 || shape.totalMatches % courts !== 0) {
    return null;
  }
  const baseMatches = shape.totalMatches / n;
  if (courts % baseMatches !== 0) {
    return null;
  }
  const copiesPerRound = courts / baseMatches;
  const found = findCyclicBase({ playerCount: n, baseMatches, copiesPerRound });
  if (!found || found.quality.prefixDelta > MAX_PREFIX_DELTA) {
    return null;
  }

  const period = n / copiesPerRound;
  const idAt = (value: number) => players[((value % n) + n) % n].id;
  return Array.from({ length: period }, (_, index): Round => {
    const roundNumber = index + 1;
    const matches: Match[] = [];
    for (let copy = 0; copy < copiesPerRound; copy += 1) {
      const shift = found.step * index + copy * period;
      for (let m = 0; m < baseMatches; m += 1) {
        const [a1, a2, b1, b2] = found.base.slice(m * 4, m * 4 + 4);
        matches.push({
          id: createId("match"),
          round: roundNumber,
          court: matches.length + 1,
          teamA: [idAt(a1 + shift), idAt(a2 + shift)],
          teamB: [idAt(b1 + shift), idAt(b2 + shift)],
          completed: false
        });
      }
    }
    return { id: createId("round"), roundNumber, matches, isLocked: false };
  });
}

/** The cyclic design wins only when it repeats fewer pairings and nobody sits out longer. */
export function preferCyclic(cyclic: Round[], searched: Round[], players: Player[]): boolean {
  const playerIds = players.map((player) => player.id);
  return (
    repeatCost(cyclic) < repeatCost(searched) &&
    worstStreaks(cyclic, playerIds).rest <= worstStreaks(searched, playerIds).rest
  );
}

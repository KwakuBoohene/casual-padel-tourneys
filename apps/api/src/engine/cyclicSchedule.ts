import { createId } from "@padel/shared";
import type { Match, Player, Round } from "@padel/shared";

import { findCyclicBase } from "./cyclicBase.js";
import { repeatCost } from "./repeatLedger.js";
import { gamesGaps, worstStreaks } from "./restStreaks.js";
import type { ScheduleShape } from "./scheduleMath.js";

/** A designed schedule may let two players drift this many games apart part-way through. */
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
  if (!found) {
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

/**
 * A designed schedule wins outright when it is the only one of the two that finishes with
 * everyone on the same number of games. Otherwise it must repeat fewer pairings without making
 * anyone sit out longer or letting game counts drift further apart along the way.
 */
export function preferDesigned(designed: Round[], searched: Round[], players: Player[]): boolean {
  const playerIds = players.map((player) => player.id);
  const designedGaps = gamesGaps(designed, playerIds);
  const searchedGaps = gamesGaps(searched, playerIds);
  if (searchedGaps.final > 1 && designedGaps.final === 0) {
    return true;
  }
  return (
    repeatCost(designed) < repeatCost(searched) &&
    worstStreaks(designed, playerIds).rest <= worstStreaks(searched, playerIds).rest &&
    designedGaps.worst <= Math.max(MAX_PREFIX_DELTA, searchedGaps.worst)
  );
}

import { gcd, rhythmQuality, rhythmScore, type RhythmQuality } from "./cyclicPattern.js";

/**
 * Finds the "starter" matches of a cyclic Americano design. Players are numbered 0..n-1 and each
 * round is the starter matches with every number shifted by the same amount (wrapping round).
 * Two players' numbers always differ by the same amount as the round shifts, so if the starter
 * matches use every possible difference as evenly as possible, the whole schedule does too:
 * no repeated partners and the fewest repeated opponents that are mathematically possible.
 */

export interface CyclicBase {
  /** Starter matches, flattened: [a1, a2, b1, b2] per match, team a vs team b. */
  base: number[];
  /** Shift between consecutive rounds, chosen to spread each player's games evenly. */
  step: number;
  quality: RhythmQuality;
}

export interface CyclicBaseInput {
  playerCount: number;
  /** Starter matches; every player ends up with four games per starter match. */
  baseMatches: number;
  /** How many shifted copies of the starter matches share one round (courts = baseMatches * copies). */
  copiesPerRound: number;
}

const NODE_BUDGET = 1_500_000;
const MAX_CANDIDATES = 200;

export function findCyclicBase(input: CyclicBaseInput): CyclicBase | null {
  const { playerCount: n, baseMatches, copiesPerRound } = input;
  if (n % copiesPerRound !== 0 || 4 * baseMatches * copiesPerRound > n) {
    return null;
  }
  const period = n / copiesPerRound;
  const half = n % 2 === 0 ? n / 2 : -1;
  const steps = stepsFor(n, period);
  const allowance = cheapestOpponentCost(n, 4 * baseMatches, half);

  const partnerUsed = new Uint8Array(n);
  const opponentUses = new Int32Array(n);
  const residueUsed = new Uint8Array(period);
  const chosen: number[] = [];
  let nodes = 0;
  let candidates = 0;
  let best: (CyclicBase & { score: number }) | null = null;

  const gap = (a: number, b: number) => Math.min((a - b + n) % n, (b - a + n) % n);
  const opponentCost = (difference: number) =>
    difference === half ? halfGapCost(n, opponentUses[difference]) : n * opponentUses[difference] ** 2;

  const consider = () => {
    candidates += 1;
    const residues = new Set(chosen.map((value) => value % period));
    for (const step of steps) {
      const plays = Array.from({ length: period }, (_, round) =>
        residues.has((((-step * round) % period) + period) % period)
      );
      const quality = rhythmQuality(plays);
      const score = rhythmScore(quality);
      if (!best || score < best.score) {
        best = { base: [...chosen], step, quality, score };
      }
    }
  };

  const search = (cost: number): void => {
    if (chosen.length === 4 * baseMatches) {
      consider();
      return;
    }
    const slot = chosen.length % 4;
    const start = chosen.length - slot;
    const limit = chosen.length === 0 ? 1 : n;
    for (let value = 0; value < limit && nodes < NODE_BUDGET && candidates < MAX_CANDIDATES; value += 1) {
      nodes += 1;
      if (residueUsed[value % period] || breaksOrdering(chosen, slot, start, value)) {
        continue;
      }
      const partnerGap = slot === 1 || slot === 3 ? gap(value, chosen[chosen.length - 1]) : -1;
      if (partnerGap >= 0 && (partnerGap === half || partnerUsed[partnerGap])) {
        continue;
      }
      const facing = slot >= 2 ? [gap(value, chosen[start]), gap(value, chosen[start + 1])] : [];
      let added = 0;
      for (const difference of facing) {
        added += opponentCost(difference);
        opponentUses[difference] += 1;
      }
      if (cost + added <= allowance) {
        if (partnerGap >= 0) partnerUsed[partnerGap] = 1;
        residueUsed[value % period] = 1;
        chosen.push(value);
        search(cost + added);
        chosen.pop();
        residueUsed[value % period] = 0;
        if (partnerGap >= 0) partnerUsed[partnerGap] = 0;
      }
      for (const difference of facing) {
        opponentUses[difference] -= 1;
      }
    }
  };

  search(0);
  const found = best as (CyclicBase & { score: number }) | null;
  return found ? { base: found.base, step: found.step, quality: found.quality } : null;
}

/** Mirror-image and reordered starters are the same design, so only one ordering is explored. */
function breaksOrdering(chosen: number[], slot: number, start: number, value: number): boolean {
  if (slot === 0) return chosen.length > 0 && value < chosen[start - 4];
  if (slot === 3) return value < chosen[start + 2];
  return value < chosen[start];
}

function stepsFor(n: number, period: number): number[] {
  const steps: number[] = [];
  for (let step = 1; step < Math.max(2, period); step += 1) {
    if (gcd(step, n) === 1) steps.push(step);
  }
  return steps;
}

/** The exactly-opposite difference only has n/2 pairs, so each use makes every one of them meet twice. */
function halfGapCost(n: number, uses: number): number {
  return (n / 2) * ((2 * uses) ** 2 + (2 * uses + 1) ** 2);
}

/** Lowest total repeat cost any starter can reach when its opponent pairings are spread perfectly. */
function cheapestOpponentCost(n: number, opponentPairs: number, half: number): number {
  const uses = new Array<number>(Math.floor((n - 1) / 2)).fill(0);
  let halfUses = 0;
  let total = 0;
  for (let i = 0; i < opponentPairs; i += 1) {
    let cheapest = Infinity;
    let index = -1;
    uses.forEach((count, candidate) => {
      if (n * count * count < cheapest) {
        cheapest = n * count * count;
        index = candidate;
      }
    });
    if (half >= 0 && halfGapCost(n, halfUses) < cheapest) {
      total += halfGapCost(n, halfUses);
      halfUses += 1;
    } else {
      total += cheapest;
      uses[index] += 1;
    }
  }
  return total;
}

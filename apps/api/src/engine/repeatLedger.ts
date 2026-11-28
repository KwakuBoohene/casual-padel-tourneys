import type { Match } from "@padel/shared";

/** Facing the same opposing pair again is the one thing Americano must never do. */
const REMATCH_WEIGHT = 1_000_000;
const PARTNER_WEIGHT = 1_000;
const OPPONENT_WEIGHT = 10;

/**
 * Running cost of every repeated pairing in a schedule. Each extra repeat of the same pairing
 * costs far more than the last, so the cheapest schedule spreads unavoidable repeats evenly.
 */
export class RepeatLedger {
  cost = 0;
  private readonly size: number;
  private readonly indexById = new Map<string, number>();
  private readonly partners = new Map<number, number>();
  private readonly opponents = new Map<number, number>();
  private readonly opposingTeams = new Map<number, number>();

  constructor(playerIds: Iterable<string>) {
    for (const id of playerIds) {
      if (!this.indexById.has(id)) {
        this.indexById.set(id, this.indexById.size);
      }
    }
    this.size = this.indexById.size;
  }

  apply(match: Match, sign: 1 | -1): void {
    const a1 = this.index(match.teamA[0]);
    const a2 = this.index(match.teamA[1]);
    const b1 = this.index(match.teamB[0]);
    const b2 = this.index(match.teamB[1]);
    const teamA = this.pair(a1, a2);
    const teamB = this.pair(b1, b2);
    const pairs = this.size * this.size;

    this.bump(this.partners, teamA, PARTNER_WEIGHT, sign);
    this.bump(this.partners, teamB, PARTNER_WEIGHT, sign);
    for (const a of [a1, a2]) {
      this.bump(this.opponents, this.pair(a, b1), OPPONENT_WEIGHT, sign);
      this.bump(this.opponents, this.pair(a, b2), OPPONENT_WEIGHT, sign);
      this.bump(this.opposingTeams, a * pairs + teamB, REMATCH_WEIGHT, sign);
    }
    for (const b of [b1, b2]) {
      this.bump(this.opposingTeams, b * pairs + teamA, REMATCH_WEIGHT, sign);
    }
  }

  private index(playerId: string): number {
    const index = this.indexById.get(playerId);
    if (index === undefined) {
      throw new Error(`Unknown player in schedule: ${playerId}`);
    }
    return index;
  }

  private pair(a: number, b: number): number {
    return a < b ? a * this.size + b : b * this.size + a;
  }

  private bump(counts: Map<number, number>, key: number, weight: number, sign: 1 | -1): void {
    const current = counts.get(key) ?? 0;
    const repeats = sign === 1 ? current : current - 1;
    this.cost += sign * weight * repeats * repeats;
    counts.set(key, current + sign);
  }
}

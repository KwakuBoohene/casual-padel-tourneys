import type { Match, Player, Round } from "@padel/shared";

import type { AmericanoVariant } from "./classicRoundSearch.js";
import { RepeatLedger } from "./repeatLedger.js";
import { withinStreakLimits, worstStreaks } from "./restStreaks.js";

/**
 * Rounds are built greedily, one court at a time, so late rounds inherit whatever pairings are
 * left over. This pass anneals the finished schedule: it swaps players inside a round, or trades
 * two players between neighbouring rounds, keeping whatever lowers repeated partners/opponents.
 * Nobody's game count changes and nobody rests (or plays) longer in a row than before.
 */

/** Annealing schedule: warm enough to trade one repeated opponent for another, far too cold to accept a partner repeat. */
const START_TEMPERATURE = 12;
const END_TEMPERATURE = 0.4;
const MOVES_PER_SEAT = 400;
const MAX_MOVES = 60_000;
/** Share of moves that trade players between neighbouring rounds instead of within one. */
const EXCHANGE_RATE = 0.3;

export interface RefineInput {
  /** Freshly generated rounds; their matches are rewritten in place. */
  rounds: Round[];
  /** Already played rounds: they count towards repeats but are never modified. */
  lockedRounds: Round[];
  players: Player[];
  variant: AmericanoVariant;
}

interface Seat {
  match: Match;
  team: "teamA" | "teamB";
  index: 0 | 1;
}

export function refineClassicRounds(input: RefineInput): void {
  const allRounds = [...input.lockedRounds, ...input.rounds];
  const allMatches = allRounds.flatMap((round) => round.matches);
  const ledger = new RepeatLedger(allMatches.flatMap((match) => [...match.teamA, ...match.teamB]));
  allMatches.forEach((match) => ledger.apply(match, 1));

  const seatsByRound = input.rounds.map(seatsOf).filter((seats) => seats.length > 0);
  const seatCount = seatsByRound.reduce((sum, seats) => sum + seats.length, 0);
  if (ledger.cost === 0 || seatCount === 0) {
    return;
  }

  const limits = worstStreaks(allRounds, input.players.map((player) => player.id));
  const genderById = new Map(input.players.map((player) => [player.id, player.gender]));
  const compatible = (a: Seat, b: Seat) =>
    input.variant !== "MIXED" || genderById.get(idAt(a)) === genderById.get(idAt(b));
  const random = seededRandom(seatCount);
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
  const moves = Math.min(MAX_MOVES, seatCount * MOVES_PER_SEAT);
  const cooling = Math.pow(END_TEMPERATURE / START_TEMPERATURE, 1 / moves);

  let temperature = START_TEMPERATURE;
  let best = { cost: ledger.cost, teams: snapshot(input.rounds) };
  for (let move = 0; move < moves && best.cost > 0; move += 1, temperature *= cooling) {
    const roundIndex = Math.floor(random() * seatsByRound.length);
    const seats = seatsByRound[roundIndex];
    const neighbour = seatsByRound[roundIndex + 1];
    const exchange = neighbour !== undefined && random() < EXCHANGE_RATE;
    const a = pick(seats);
    const b = pick(exchange ? neighbour : seats);
    const legal = exchange ? !plays(neighbour, a) && !plays(seats, b) : !sameTeam(a, b);
    if (!legal || !compatible(a, b)) {
      continue;
    }

    const delta = swap(a, b, ledger);
    const rejected =
      (delta > 0 && random() >= Math.exp(-delta / temperature)) ||
      (exchange && !withinStreakLimits(allRounds, [idAt(a), idAt(b)], limits));
    if (rejected) {
      swap(a, b, ledger);
    } else if (ledger.cost < best.cost) {
      best = { cost: ledger.cost, teams: snapshot(input.rounds) };
    }
  }
  restore(input.rounds, best.teams);
}

/** Swaps two seated players and reports how much the schedule cost changed. */
function swap(a: Seat, b: Seat, ledger: RepeatLedger): number {
  const touched = a.match === b.match ? [a.match] : [a.match, b.match];
  const before = ledger.cost;
  touched.forEach((match) => ledger.apply(match, -1));
  const held = idAt(a);
  a.match[a.team][a.index] = idAt(b);
  b.match[b.team][b.index] = held;
  touched.forEach((match) => ledger.apply(match, 1));
  return ledger.cost - before;
}

function idAt(seat: Seat): string {
  return seat.match[seat.team][seat.index];
}

function sameTeam(a: Seat, b: Seat): boolean {
  return a.match === b.match && a.team === b.team;
}

function plays(seats: Seat[], seat: Seat): boolean {
  const playerId = idAt(seat);
  return seats.some((candidate) => idAt(candidate) === playerId);
}

function seatsOf(round: Round): Seat[] {
  return round.matches.flatMap((match) =>
    (["teamA", "teamB"] as const).flatMap((team) =>
      ([0, 1] as const).map((index) => ({ match, team, index }))
    )
  );
}

type Teams = Pick<Match, "teamA" | "teamB">;

function snapshot(rounds: Round[]): Teams[] {
  return rounds.flatMap((round) =>
    round.matches.map((match): Teams => ({ teamA: [...match.teamA], teamB: [...match.teamB] }))
  );
}

function restore(rounds: Round[], teams: Teams[]): void {
  rounds
    .flatMap((round) => round.matches)
    .forEach((match, index) => {
      match.teamA = teams[index].teamA;
      match.teamB = teams[index].teamB;
    });
}

/** Fixed-seed generator (mulberry32) so the same inputs always produce the same schedule. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

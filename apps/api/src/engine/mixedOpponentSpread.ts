import type { Match, Player, Round } from "@padel/shared";

import { RepeatLedger } from "./repeatLedger.js";
import { seededRandom } from "./seededRandom.js";

const START_TEMPERATURE = 12;
const END_TEMPERATURE = 0.4;
const MOVES_PER_MATCH = 1_500;
const MAX_MOVES = 80_000;
/** Share of trades made inside one round; the rest look for a same-block team in another round. */
const SAME_ROUND_RATE = 0.5;

export type Team = [string, string];
type Side = "teamA" | "teamB";

interface Seat {
  match: Match;
  side: Side;
}

/**
 * Anneals opponents only. Every move trades two whole teams, either inside one round or between
 * two teams of the same block, so partnerships are untouched and everybody still plays exactly
 * once per block.
 */
export function spreadOpponents(rounds: Round[], players: Player[], blockOf: Map<Team, number>): void {
  const matches = rounds.flatMap((round) => round.matches);
  const ledger = new RepeatLedger(players.map((player) => player.id));
  matches.forEach((match) => ledger.apply(match, 1));

  const seats: Seat[] = matches.flatMap((match) => [
    { match, side: "teamA" as const },
    { match, side: "teamB" as const }
  ]);
  const teamAt = (seat: Seat) => seat.match[seat.side];
  const seatsInRound = (seat: Seat) => seats.filter((other) => other.match.round === seat.match.round);

  const random = seededRandom(matches.length);
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
  const moves = Math.min(MAX_MOVES, matches.length * MOVES_PER_MATCH);
  const cooling = Math.pow(END_TEMPERATURE / START_TEMPERATURE, 1 / moves);
  const snapshot = () => matches.map((match) => ({ teamA: match.teamA, teamB: match.teamB }));

  let temperature = START_TEMPERATURE;
  let best = { cost: ledger.cost, teams: snapshot() };
  for (let move = 0; move < moves && best.cost > 0; move += 1, temperature *= cooling) {
    const first = pick(seats);
    const second = random() < SAME_ROUND_RATE ? pick(seatsInRound(first)) : pick(seats);
    const sameRound = first.match.round === second.match.round;
    const legal =
      first.match !== second.match &&
      (sameRound ||
        (blockOf.get(teamAt(first)) === blockOf.get(teamAt(second)) &&
          fitsRound(rounds[second.match.round - 1], teamAt(first), second) &&
          fitsRound(rounds[first.match.round - 1], teamAt(second), first)));
    if (!legal) {
      continue;
    }
    const delta = tradeTeams(first, second, ledger);
    if (delta > 0 && random() >= Math.exp(-delta / temperature)) {
      tradeTeams(first, second, ledger);
    } else if (ledger.cost < best.cost) {
      best = { cost: ledger.cost, teams: snapshot() };
    }
  }
  matches.forEach((match, index) => Object.assign(match, best.teams[index]));
}

/** Would `team` clash with anyone in `round` once it takes over the `vacated` seat? */
function fitsRound(round: Round, team: Team, vacated: Seat): boolean {
  return round.matches.every((match) =>
    (["teamA", "teamB"] as const).every(
      (side) =>
        (match === vacated.match && side === vacated.side) || !match[side].some((id) => team.includes(id))
    )
  );
}

function tradeTeams(first: Seat, second: Seat, ledger: RepeatLedger): number {
  const before = ledger.cost;
  ledger.apply(first.match, -1);
  ledger.apply(second.match, -1);
  const held = first.match[first.side];
  first.match[first.side] = second.match[second.side];
  second.match[second.side] = held;
  ledger.apply(first.match, 1);
  ledger.apply(second.match, 1);
  return ledger.cost - before;
}

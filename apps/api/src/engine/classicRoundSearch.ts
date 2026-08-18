import type { Player } from "@padel/shared";

import { pairKey, playerOpponentTeamKey } from "./pairingMatrices.js";

export type AmericanoVariant = "CLASSIC" | "MIXED" | "TEAM";

export interface CourtAssignment {
  teamA: [string, string];
  teamB: [string, string];
}

export interface RoundSearchInput {
  players: Player[];
  courts: number;
  variant: AmericanoVariant;
  teammateMatrix: Map<string, number>;
  opponentMatrix: Map<string, number>;
  opponentTeamMatrix: Map<string, number>;
  coPlayerMatrix: Map<string, number>;
}

interface Attempt {
  partnerWindow: number;
  allowRematch: boolean;
  requireMixed: boolean;
}

interface SplitOption {
  assignment: CourtAssignment;
  usedIds: string[];
  score: number;
}

/** How many of the next-lowest-games players may partner with the anchor on a court. */
const PARTNER_WINDOW = 12;
const WIDE_PARTNER_WINDOW = 24;
/** Branching factor per court; enough to escape dead ends without exploding. */
const OPTIONS_PER_COURT = 12;
const NODE_BUDGET = 20000;

/**
 * Fills a round court by court. Facing an opponent team twice is a hard constraint, so the
 * search backtracks rather than settling for the cheapest rematch, and only relaxes the rule
 * when the field genuinely offers no alternative.
 */
export function planRoundCourts(input: RoundSearchInput): CourtAssignment[] {
  const ordered = orderByEffectiveGames(input.players);
  const maxCourts = Math.min(input.courts, Math.floor(ordered.length / 4));
  if (maxCourts <= 0) {
    return [];
  }

  const attempts: Attempt[] = [
    { partnerWindow: PARTNER_WINDOW, allowRematch: false, requireMixed: true },
    { partnerWindow: WIDE_PARTNER_WINDOW, allowRematch: false, requireMixed: true },
    { partnerWindow: WIDE_PARTNER_WINDOW, allowRematch: true, requireMixed: true },
    { partnerWindow: WIDE_PARTNER_WINDOW, allowRematch: true, requireMixed: false }
  ];

  let best: CourtAssignment[] = [];
  for (const attempt of attempts) {
    const found = searchCourts(ordered, maxCourts, input, attempt, { nodes: 0 });
    if (found.length > best.length) {
      best = found;
    }
    if (best.length === maxCourts) {
      break;
    }
  }
  return best;
}

function searchCourts(
  available: Player[],
  courtsLeft: number,
  input: RoundSearchInput,
  attempt: Attempt,
  budget: { nodes: number }
): CourtAssignment[] {
  if (courtsLeft === 0 || available.length < 4) {
    return [];
  }

  const options = buildSplitOptions(available, input, attempt);
  let best: CourtAssignment[] = [];

  for (const option of options.slice(0, OPTIONS_PER_COURT)) {
    if (budget.nodes >= NODE_BUDGET) {
      break;
    }
    budget.nodes += 1;
    const used = new Set(option.usedIds);
    const remaining = available.filter((player) => !used.has(player.id));
    const rest = searchCourts(remaining, courtsLeft - 1, input, attempt, budget);
    const candidate = [option.assignment, ...rest];
    if (candidate.length > best.length) {
      best = candidate;
    }
    if (best.length === courtsLeft) {
      break;
    }
  }

  return best;
}

/** Every legal split of the lowest-games player plus three nearby partners, cheapest first. */
function buildSplitOptions(
  available: Player[],
  input: RoundSearchInput,
  attempt: Attempt
): SplitOption[] {
  const anchor = available[0];
  const pool = available.slice(1, 1 + attempt.partnerWindow);
  const options: SplitOption[] = [];

  for (let i = 0; i < pool.length; i += 1) {
    for (let j = i + 1; j < pool.length; j += 1) {
      for (let k = j + 1; k < pool.length; k += 1) {
        const quad: [Player, Player, Player, Player] = [anchor, pool[i], pool[j], pool[k]];
        for (const split of splitsOf(quad)) {
          if (attempt.requireMixed && input.variant === "MIXED" && !isMixedSplit(split)) {
            continue;
          }
          if (!attempt.allowRematch && facedBefore(split, input.opponentTeamMatrix)) {
            continue;
          }
          options.push({
            assignment: {
              teamA: [split[0].id, split[1].id],
              teamB: [split[2].id, split[3].id]
            },
            usedIds: quad.map((player) => player.id),
            score: splitCost(split, input)
          });
        }
      }
    }
  }

  options.sort((a, b) => a.score - b.score);
  return options;
}

type Split = [Player, Player, Player, Player];

function splitsOf(quad: Split): Split[] {
  return [
    [quad[0], quad[1], quad[2], quad[3]],
    [quad[0], quad[2], quad[1], quad[3]],
    [quad[0], quad[3], quad[1], quad[2]]
  ];
}

function facedBefore(split: Split, opponentTeamMatrix: Map<string, number>): boolean {
  const teamA = [split[0].id, split[1].id] as const;
  const teamB = [split[2].id, split[3].id] as const;
  for (const id of teamA) {
    if ((opponentTeamMatrix.get(playerOpponentTeamKey(id, teamB[0], teamB[1])) ?? 0) > 0) {
      return true;
    }
  }
  for (const id of teamB) {
    if ((opponentTeamMatrix.get(playerOpponentTeamKey(id, teamA[0], teamA[1])) ?? 0) > 0) {
      return true;
    }
  }
  return false;
}

function isMixedSplit(split: Split): boolean {
  return isMixedTeam(split[0], split[1]) && isMixedTeam(split[2], split[3]);
}

function isMixedTeam(a: Player, b: Player): boolean {
  if (!a.gender || !b.gender) {
    return false;
  }
  return a.gender !== b.gender;
}

function splitCost(split: Split, input: RoundSearchInput): number {
  const [a1, a2, b1, b2] = split;
  const games = split.reduce((sum, player) => sum + effectiveGames(player), 0);

  const teammateRepeats =
    count(input.teammateMatrix, pairKey(a1.id, a2.id)) + count(input.teammateMatrix, pairKey(b1.id, b2.id));

  const opponentRepeats =
    count(input.opponentMatrix, pairKey(a1.id, b1.id)) +
    count(input.opponentMatrix, pairKey(a1.id, b2.id)) +
    count(input.opponentMatrix, pairKey(a2.id, b1.id)) +
    count(input.opponentMatrix, pairKey(a2.id, b2.id));

  const teamRepeats =
    count(input.opponentTeamMatrix, playerOpponentTeamKey(a1.id, b1.id, b2.id)) +
    count(input.opponentTeamMatrix, playerOpponentTeamKey(a2.id, b1.id, b2.id)) +
    count(input.opponentTeamMatrix, playerOpponentTeamKey(b1.id, a1.id, a2.id)) +
    count(input.opponentTeamMatrix, playerOpponentTeamKey(b2.id, a1.id, a2.id));

  let coPlay = 0;
  for (let i = 0; i < split.length; i += 1) {
    for (let j = i + 1; j < split.length; j += 1) {
      coPlay += count(input.coPlayerMatrix, pairKey(split[i].id, split[j].id));
    }
  }

  return games * 1000 + teamRepeats * 500 + teammateRepeats * 40 + opponentRepeats * 8 + coPlay * 2;
}

function count(matrix: Map<string, number>, key: string): number {
  return matrix.get(key) ?? 0;
}

function effectiveGames(player: Player): number {
  return player.gamesPlayed + (player.handicap ?? 0);
}

function orderByEffectiveGames(players: Player[]): Player[] {
  return players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => {
      const delta = effectiveGames(a.player) - effectiveGames(b.player);
      return delta !== 0 ? delta : a.index - b.index;
    })
    .map((entry) => entry.player);
}

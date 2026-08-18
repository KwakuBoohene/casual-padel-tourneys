import { createId } from "@padel/shared";
import type { Match, Player, Round } from "@padel/shared";

import {
  bumpClassicMatchMatrices,
  createClassicPairingMatrices,
  hasFacedOpponentTeam,
  type ClassicPairingMatrices
} from "./pairingMatrices.js";

export interface BuildRoundInput {
  roundNumber: number;
  courts: number;
  variant: "CLASSIC" | "MIXED" | "TEAM";
  players: Player[];
  teammateMatrix: Map<string, number>;
  opponentMatrix: Map<string, number>;
  opponentTeamMatrix: Map<string, number>;
  coPlayerMatrix: Map<string, number>;
}

export function buildRound(input: BuildRoundInput): Round {
  const playersPerRound = input.courts * 4;
  const active = selectPlayersForRound(input.players, playersPerRound, input.coPlayerMatrix);
  const matches: Match[] = [];

  for (let index = 0; index < active.length; index += 4) {
    const group = active.slice(index, index + 4);
    if (group.length < 4) {
      break;
    }
    const teams = bestTeams(
      group,
      input.variant,
      input.teammateMatrix,
      input.opponentMatrix,
      input.opponentTeamMatrix
    );
    const match: Match = {
      id: createId("match"),
      round: input.roundNumber,
      court: matches.length + 1,
      teamA: [teams[0], teams[1]],
      teamB: [teams[2], teams[3]],
      completed: false
    };
    matches.push(match);
    bumpClassicMatchMatrices(match, input);
  }

  return {
    id: createId("round"),
    roundNumber: input.roundNumber,
    matches,
    isLocked: false
  };
}

function selectPlayersForRound(
  players: Player[],
  count: number,
  coPlayerMatrix: Map<string, number>
): Player[] {
  const selected: Player[] = [];
  const remaining = [...players];

  while (selected.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const diversityPenalty = selected.reduce(
        (sum, chosen) => sum + (coPlayerMatrix.get(pairKey(candidate.id, chosen.id)) ?? 0),
        0
      );
      const effectiveGames = candidate.gamesPlayed + (candidate.handicap ?? 0);
      const score = effectiveGames * 100 + diversityPenalty * 10;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    const [chosen] = remaining.splice(bestIndex, 1);
    selected.push(chosen);
  }
  return selected;
}

function bestTeams(
  players: Player[],
  variant: "CLASSIC" | "MIXED" | "TEAM",
  teammateMatrix: Map<string, number>,
  opponentMatrix: Map<string, number>,
  opponentTeamMatrix: Map<string, number>
): [string, string, string, string] {
  const ids = players.map((player) => player.id);
  const combos: [string, string, string, string][] = [
    [ids[0], ids[1], ids[2], ids[3]],
    [ids[0], ids[2], ids[1], ids[3]],
    [ids[0], ids[3], ids[1], ids[2]]
  ];

  const mixedValid = (candidate: [string, string, string, string]) =>
    variant !== "MIXED" || isMixedValid(candidate, players);

  const noRematch = combos.filter(
    (candidate) =>
      mixedValid(candidate) &&
      !hasFacedOpponentTeam(opponentTeamMatrix, [candidate[0], candidate[1]], [candidate[2], candidate[3]])
  );
  const candidates = noRematch.length > 0 ? noRematch : combos.filter(mixedValid);

  let best = candidates[0] ?? combos[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const score =
      teammateCost(candidate[0], candidate[1], teammateMatrix) +
      teammateCost(candidate[2], candidate[3], teammateMatrix) +
      opponentCost(candidate, opponentMatrix) +
      opponentTeamCost(candidate, opponentTeamMatrix);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function isMixedValid(candidate: [string, string, string, string], players: Player[]): boolean {
  const byId = new Map(players.map((player) => [player.id, player]));
  const teamA = [byId.get(candidate[0]), byId.get(candidate[1])];
  const teamB = [byId.get(candidate[2]), byId.get(candidate[3])];
  return isMixedTeam(teamA[0], teamA[1]) && isMixedTeam(teamB[0], teamB[1]);
}

function isMixedTeam(a?: Player, b?: Player): boolean {
  if (!a?.gender || !b?.gender) {
    return false;
  }
  return (a.gender === "MALE" && b.gender === "FEMALE") || (a.gender === "FEMALE" && b.gender === "MALE");
}

function teammateCost(a: string, b: string, matrix: Map<string, number>): number {
  return matrix.get(pairKey(a, b)) ?? 0;
}

function opponentCost(candidate: [string, string, string, string], matrix: Map<string, number>): number {
  const [a1, a2, b1, b2] = candidate;
  return (
    (matrix.get(pairKey(a1, b1)) ?? 0) +
    (matrix.get(pairKey(a1, b2)) ?? 0) +
    (matrix.get(pairKey(a2, b1)) ?? 0) +
    (matrix.get(pairKey(a2, b2)) ?? 0)
  );
}

function opponentTeamCost(
  candidate: [string, string, string, string],
  matrix: Map<string, number>
): number {
  const teamA: [string, string] = [candidate[0], candidate[1]];
  const teamB: [string, string] = [candidate[2], candidate[3]];
  let cost = 0;
  for (const playerId of teamA) {
    cost += matrix.get(playerOpponentTeamKey(playerId, teamB[0], teamB[1])) ?? 0;
  }
  for (const playerId of teamB) {
    cost += matrix.get(playerOpponentTeamKey(playerId, teamA[0], teamA[1])) ?? 0;
  }
  return cost;
}

function playerOpponentTeamKey(playerId: string, oppA: string, oppB: string): string {
  return `${playerId}|${[oppA, oppB].sort().join(":")}`;
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export { createClassicPairingMatrices, type ClassicPairingMatrices } from "./pairingMatrices.js";

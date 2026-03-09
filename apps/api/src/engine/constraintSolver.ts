import { createId } from "@padel/shared";
import type { Match, Player, Round } from "@padel/shared";

export interface BuildRoundInput {
  roundNumber: number;
  courts: number;
  players: Player[];
  teammateMatrix: Map<string, number>;
  opponentMatrix: Map<string, number>;
}

export function buildRound(input: BuildRoundInput): Round {
  const playersPerRound = input.courts * 4;
  const sorted = [...input.players].sort((a, b) => a.gamesPlayed - b.gamesPlayed);
  const active = sorted.slice(0, playersPerRound);
  const matches: Match[] = [];

  for (let index = 0; index < active.length; index += 4) {
    const group = active.slice(index, index + 4);
    if (group.length < 4) {
      break;
    }
    const teams = bestTeams(group.map((player) => player.id), input.teammateMatrix, input.opponentMatrix);
    const match: Match = {
      id: createId("match"),
      round: input.roundNumber,
      court: matches.length + 1,
      teamA: [teams[0], teams[1]],
      teamB: [teams[2], teams[3]],
      completed: false
    };
    matches.push(match);
    bumpMatrices(match, input.teammateMatrix, input.opponentMatrix);
  }

  return {
    id: createId("round"),
    roundNumber: input.roundNumber,
    matches,
    isLocked: false
  };
}

function bestTeams(
  players: string[],
  teammateMatrix: Map<string, number>,
  opponentMatrix: Map<string, number>
): [string, string, string, string] {
  const combos: [string, string, string, string][] = [
    [players[0], players[1], players[2], players[3]],
    [players[0], players[2], players[1], players[3]],
    [players[0], players[3], players[1], players[2]]
  ];

  let best = combos[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of combos) {
    const score =
      teammateCost(candidate[0], candidate[1], teammateMatrix) +
      teammateCost(candidate[2], candidate[3], teammateMatrix) +
      opponentCost(candidate, opponentMatrix);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
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

function bumpMatrices(match: Match, teammateMatrix: Map<string, number>, opponentMatrix: Map<string, number>): void {
  bump(teammateMatrix, match.teamA[0], match.teamA[1]);
  bump(teammateMatrix, match.teamB[0], match.teamB[1]);
  for (const playerA of match.teamA) {
    for (const playerB of match.teamB) {
      bump(opponentMatrix, playerA, playerB);
    }
  }
}

function bump(matrix: Map<string, number>, a: string, b: string): void {
  const key = pairKey(a, b);
  matrix.set(key, (matrix.get(key) ?? 0) + 1);
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

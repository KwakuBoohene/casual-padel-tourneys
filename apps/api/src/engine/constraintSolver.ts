import { createId } from "@padel/shared";
import type { Match, Player, Round } from "@padel/shared";

export interface BuildRoundInput {
  roundNumber: number;
  courts: number;
  variant: "CLASSIC" | "MIXED" | "TEAM";
  players: Player[];
  teammateMatrix: Map<string, number>;
  opponentMatrix: Map<string, number>;
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
    const teams = bestTeams(group, input.variant, input.teammateMatrix, input.opponentMatrix);
    const match: Match = {
      id: createId("match"),
      round: input.roundNumber,
      court: matches.length + 1,
      teamA: [teams[0], teams[1]],
      teamB: [teams[2], teams[3]],
      completed: false
    };
    matches.push(match);
    bumpMatrices(match, input.teammateMatrix, input.opponentMatrix, input.coPlayerMatrix);
  }

  return {
    id: createId("round"),
    roundNumber: input.roundNumber,
    matches,
    isLocked: false
  };
}

function selectPlayersForRound(players: Player[], count: number, coPlayerMatrix: Map<string, number>): Player[] {
  const selected: Player[] = [];
  const remaining = [...players];

  while (selected.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const diversityPenalty = selected.reduce((sum, chosen) => sum + (coPlayerMatrix.get(pairKey(candidate.id, chosen.id)) ?? 0), 0);
      const score = candidate.gamesPlayed * 100 + diversityPenalty * 10;
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
  opponentMatrix: Map<string, number>
): [string, string, string, string] {
  const ids = players.map((player) => player.id);
  const combos: [string, string, string, string][] = [
    [ids[0], ids[1], ids[2], ids[3]],
    [ids[0], ids[2], ids[1], ids[3]],
    [ids[0], ids[3], ids[1], ids[2]]
  ];

  let best = combos[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of combos) {
    if (variant === "MIXED" && !isMixedValid(candidate, players)) {
      continue;
    }
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

function bumpMatrices(
  match: Match,
  teammateMatrix: Map<string, number>,
  opponentMatrix: Map<string, number>,
  coPlayerMatrix: Map<string, number>
): void {
  bump(teammateMatrix, match.teamA[0], match.teamA[1]);
  bump(teammateMatrix, match.teamB[0], match.teamB[1]);
  const allPlayers = [...match.teamA, ...match.teamB];
  for (let i = 0; i < allPlayers.length; i += 1) {
    for (let j = i + 1; j < allPlayers.length; j += 1) {
      bump(coPlayerMatrix, allPlayers[i], allPlayers[j]);
    }
  }
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

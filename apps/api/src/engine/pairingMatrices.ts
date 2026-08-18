import type { Match, Round } from "@padel/shared";

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export function opponentTeamKey(oppA: string, oppB: string): string {
  return pairKey(oppA, oppB);
}

export function playerOpponentTeamKey(playerId: string, oppA: string, oppB: string): string {
  return `${playerId}|${opponentTeamKey(oppA, oppB)}`;
}

export interface ClassicPairingMatrices {
  teammateMatrix: Map<string, number>;
  opponentMatrix: Map<string, number>;
  opponentTeamMatrix: Map<string, number>;
  coPlayerMatrix: Map<string, number>;
}

export function createClassicPairingMatrices(): ClassicPairingMatrices {
  return {
    teammateMatrix: new Map(),
    opponentMatrix: new Map(),
    opponentTeamMatrix: new Map(),
    coPlayerMatrix: new Map()
  };
}

export function bumpClassicMatchMatrices(match: Match, matrices: ClassicPairingMatrices): void {
  bumpPair(matrices.teammateMatrix, match.teamA[0], match.teamA[1]);
  bumpPair(matrices.teammateMatrix, match.teamB[0], match.teamB[1]);
  const allPlayers = [...match.teamA, ...match.teamB];
  for (let i = 0; i < allPlayers.length; i += 1) {
    for (let j = i + 1; j < allPlayers.length; j += 1) {
      bumpPair(matrices.coPlayerMatrix, allPlayers[i], allPlayers[j]);
    }
  }
  for (const playerA of match.teamA) {
    for (const playerB of match.teamB) {
      bumpPair(matrices.opponentMatrix, playerA, playerB);
    }
  }
  for (const playerId of match.teamA) {
    bumpOpponentTeam(matrices.opponentTeamMatrix, playerId, match.teamB[0], match.teamB[1]);
  }
  for (const playerId of match.teamB) {
    bumpOpponentTeam(matrices.opponentTeamMatrix, playerId, match.teamA[0], match.teamA[1]);
  }
}

export function hasFacedOpponentTeam(
  opponentTeamMatrix: Map<string, number>,
  teamA: readonly [string, string],
  teamB: readonly [string, string]
): boolean {
  for (const playerId of teamA) {
    if ((opponentTeamMatrix.get(playerOpponentTeamKey(playerId, teamB[0], teamB[1])) ?? 0) > 0) {
      return true;
    }
  }
  for (const playerId of teamB) {
    if ((opponentTeamMatrix.get(playerOpponentTeamKey(playerId, teamA[0], teamA[1])) ?? 0) > 0) {
      return true;
    }
  }
  return false;
}

export function seedClassicMatricesFromRounds(rounds: Round[], matrices: ClassicPairingMatrices): void {
  for (const round of rounds) {
    for (const match of round.matches) {
      bumpClassicMatchMatrices(match, matrices);
    }
  }
}

export function teamPairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function bumpTeamOpponent(matrix: Map<string, number>, a: string, b: string): void {
  const key = teamPairKey(a, b);
  matrix.set(key, (matrix.get(key) ?? 0) + 1);
}

export function seedTeamOpponentMatrixFromRounds(
  rounds: Round[],
  pairIdForPlayer: (playerId: string) => string | undefined
): Map<string, number> {
  const opponentMatrix = new Map<string, number>();
  for (const round of rounds) {
    for (const match of round.matches) {
      const pairA = pairIdForPlayer(match.teamA[0]);
      const pairB = pairIdForPlayer(match.teamB[0]);
      if (pairA && pairB) {
        bumpTeamOpponent(opponentMatrix, pairA, pairB);
      }
    }
  }
  return opponentMatrix;
}

function bumpPair(matrix: Map<string, number>, a: string, b: string): void {
  const key = pairKey(a, b);
  matrix.set(key, (matrix.get(key) ?? 0) + 1);
}

function bumpOpponentTeam(matrix: Map<string, number>, playerId: string, oppA: string, oppB: string): void {
  const key = playerOpponentTeamKey(playerId, oppA, oppB);
  matrix.set(key, (matrix.get(key) ?? 0) + 1);
}

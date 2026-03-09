import type { Match, Player, Round } from "@padel/shared";

export function maxGamesDelta(players: Player[]): number {
  if (players.length === 0) {
    return 0;
  }
  const values = players.map((player) => player.gamesPlayed);
  return Math.max(...values) - Math.min(...values);
}

export function countTeammateRepeats(rounds: Round[]): number {
  const pairCounts = new Map<string, number>();
  for (const round of rounds) {
    for (const match of round.matches) {
      addPair(pairCounts, match.teamA[0], match.teamA[1]);
      addPair(pairCounts, match.teamB[0], match.teamB[1]);
    }
  }
  return [...pairCounts.values()].filter((count) => count > 1).length;
}

export function countOpponentRepeats(rounds: Round[]): number {
  const pairCounts = new Map<string, number>();
  for (const round of rounds) {
    for (const match of round.matches) {
      addOpponents(pairCounts, match);
    }
  }
  return [...pairCounts.values()].filter((count) => count > 1).length;
}

function addPair(store: Map<string, number>, a: string, b: string): void {
  const key = [a, b].sort().join(":");
  store.set(key, (store.get(key) ?? 0) + 1);
}

function addOpponents(store: Map<string, number>, match: Match): void {
  const allA = [match.teamA[0], match.teamA[1]];
  const allB = [match.teamB[0], match.teamB[1]];
  for (const playerA of allA) {
    for (const playerB of allB) {
      addPair(store, playerA, playerB);
    }
  }
}

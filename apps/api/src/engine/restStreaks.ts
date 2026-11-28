import type { Round } from "@padel/shared";

export interface StreakLimits {
  rest: number;
  play: number;
}

function playsIn(round: Round, playerId: string): boolean {
  return round.matches.some((match) => match.teamA.includes(playerId) || match.teamB.includes(playerId));
}

/** Longest run of consecutive rounds a player sits out, and longest run they play. */
export function longestStreaks(rounds: Round[], playerId: string): StreakLimits {
  const longest: StreakLimits = { rest: 0, play: 0 };
  let rest = 0;
  let play = 0;
  for (const round of rounds) {
    const playing = playsIn(round, playerId);
    rest = playing ? 0 : rest + 1;
    play = playing ? play + 1 : 0;
    longest.rest = Math.max(longest.rest, rest);
    longest.play = Math.max(longest.play, play);
  }
  return longest;
}

export function worstStreaks(rounds: Round[], playerIds: string[]): StreakLimits {
  const worst: StreakLimits = { rest: 0, play: 0 };
  for (const playerId of playerIds) {
    const streaks = longestStreaks(rounds, playerId);
    worst.rest = Math.max(worst.rest, streaks.rest);
    worst.play = Math.max(worst.play, streaks.play);
  }
  return worst;
}

export function withinStreakLimits(rounds: Round[], playerIds: string[], limits: StreakLimits): boolean {
  return playerIds.every((playerId) => {
    const streaks = longestStreaks(rounds, playerId);
    return streaks.rest <= limits.rest && streaks.play <= limits.play;
  });
}

/** Largest gap in games played between any two players after any round, and after the last one. */
export function gamesGaps(rounds: Round[], playerIds: string[]): { worst: number; final: number } {
  const games = new Map(playerIds.map((playerId) => [playerId, 0]));
  let worst = 0;
  let final = 0;
  for (const round of rounds) {
    for (const match of round.matches) {
      for (const playerId of [...match.teamA, ...match.teamB]) {
        games.set(playerId, (games.get(playerId) ?? 0) + 1);
      }
    }
    final = Math.max(...games.values()) - Math.min(...games.values());
    worst = Math.max(worst, final);
  }
  return { worst, final };
}

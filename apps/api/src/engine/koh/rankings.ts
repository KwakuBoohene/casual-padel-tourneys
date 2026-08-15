import type { KohEngineUnit } from "./types.js";

/** Unit stats used for standings (strongest → weakest). */
export type KohRankingCandidate = KohEngineUnit & {
  courtNumber: number;
  gamesWon: number;
  gamesLost: number;
};

export type KohSortedRanking = KohRankingCandidate & {
  gameDiff: number;
};

/**
 * Rank strongest first:
 * 1) higher match W–L differential
 * 2) more special (golden/star) losses ranks higher when W–L tied
 * 3) higher game differential
 * Stable by unit id as last resort.
 */
export function sortKohRankings(units: KohRankingCandidate[]): KohSortedRanking[] {
  const rows = units.map((unit) => ({
    ...unit,
    specialLosses: unit.specialLosses ?? 0,
    gameDiff: unit.gamesWon - unit.gamesLost
  }));

  rows.sort((a, b) => {
    const wlA = a.matchesWon - a.matchesLost;
    const wlB = b.matchesWon - b.matchesLost;
    if (wlB !== wlA) return wlB - wlA;
    const specialA = a.specialLosses ?? 0;
    const specialB = b.specialLosses ?? 0;
    if (specialB !== specialA) return specialB - specialA;
    if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
    return a.id.localeCompare(b.id);
  });

  return rows;
}

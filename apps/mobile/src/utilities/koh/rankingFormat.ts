import type { KohRankingRow } from "@padel/shared";

/** Compact stats line: `4-1 +9 G-lost 1` */
export function formatKohRankingStats(row: KohRankingRow): string {
  const wl = `${row.matchesWon}-${row.matchesLost}`;
  const diff = row.gameDiff > 0 ? `+${row.gameDiff}` : String(row.gameDiff);
  const special = row.specialLosses > 0 ? ` G-lost ${row.specialLosses}` : "";
  return `${wl} ${diff}${special}`;
}

export function formatKohUnitLabel(playerAName: string, playerBName: string): string {
  return `${playerAName} / ${playerBName}`;
}

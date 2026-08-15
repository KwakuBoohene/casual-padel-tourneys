/**
 * Documented Regular duration heuristic (tunable).
 * Assumes ~12 minutes per set to win (first-to-N sets), independent of rally points.
 */
export const REGULAR_MINUTES_PER_SET = 12;

export function regularMatchTimeMinutes(setsToWin: number): number {
  const sets = Number.isFinite(setsToWin) && setsToWin >= 1 ? Math.trunc(setsToWin) : 1;
  return sets * REGULAR_MINUTES_PER_SET;
}

export function americanoMatchTimeMinutes(pointsPerMatch: number): number {
  return (pointsPerMatch * 35) / 60;
}

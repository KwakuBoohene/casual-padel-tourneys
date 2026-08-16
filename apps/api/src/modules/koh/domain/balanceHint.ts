/** Nudge the organizer when court sizes drift apart enough to skew waiting time. */
export function computeBalanceHint(unitCounts: number[]): string | null {
  if (unitCounts.length === 0) {
    return null;
  }
  const min = Math.min(...unitCounts);
  const max = Math.max(...unitCounts);
  if (max - min > 1) {
    return "Court sizes differ by more than 1 — rebalance if possible.";
  }
  return null;
}

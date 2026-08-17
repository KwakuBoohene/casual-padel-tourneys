export function sharedMatchIds(matchIdsA: string[], matchIdsB: string[]): string[] {
  const other = new Set(matchIdsB);
  return [...new Set(matchIdsA.filter((id) => other.has(id)))];
}

export function canMergeCareers(matchIdsA: string[], matchIdsB: string[]): boolean {
  return sharedMatchIds(matchIdsA, matchIdsB).length === 0;
}

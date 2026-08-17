/** Case-insensitive unique names; later values win (career names override event names). */
export function mergePlayerSuggestionNames(eventNames: string[], careerNames: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const name of [...eventNames, ...careerNames]) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase().replace(/\s+/g, " ");
    if (!key) continue;
    byKey.set(key, trimmed);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/** Match the query against the start of the full name or any word. */
export function filterPlayerNameSuggestions(
  query: string,
  names: string[],
  usedNames: string[],
  limit = 6
): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const used = new Set(usedNames.map((name) => name.trim().toLowerCase()));
  const matches: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || used.has(lower) || lower === q) continue;
    const words = lower.split(/\s+/);
    if (lower.startsWith(q) || words.some((word) => word.startsWith(q))) {
      matches.push(trimmed);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

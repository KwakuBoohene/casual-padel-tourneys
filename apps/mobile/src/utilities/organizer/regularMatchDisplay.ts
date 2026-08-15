import type { MatchSet } from "@padel/shared";

/** Format one set line: `6–4` or `6–6 TB 7–5`. */
export function formatRegularSetScore(set: MatchSet): string {
  if (set.gamesA === 6 && set.gamesB === 6 && (set.tbA !== undefined || set.tbB !== undefined)) {
    return `6–6 TB ${set.tbA ?? 0}–${set.tbB ?? 0}`;
  }
  return `${set.gamesA}–${set.gamesB}`;
}

/** Join set lines for a match card / player history. */
export function formatRegularMatchScore(sets: MatchSet[] | undefined): string | null {
  if (!sets || sets.length === 0) {
    return null;
  }
  const meaningful = sets.filter(
    (set) => set.gamesA > 0 || set.gamesB > 0 || set.tbA !== undefined || set.tbB !== undefined
  );
  if (meaningful.length === 0) {
    return null;
  }
  return meaningful.map(formatRegularSetScore).join(", ");
}

export function regularMatchStatusLine(input: {
  sets?: MatchSet[];
  completed: boolean;
  canEdit: boolean;
}): { text: string; emphasize: boolean } {
  const score = formatRegularMatchScore(input.sets);
  if (!score) {
    return { text: "Tap to enter score", emphasize: true };
  }
  if (input.completed) {
    return { text: `${score} · Done`, emphasize: false };
  }
  if (!input.canEdit) {
    return { text: `${score} · Done`, emphasize: false };
  }
  return { text: `${score} · draft`, emphasize: false };
}

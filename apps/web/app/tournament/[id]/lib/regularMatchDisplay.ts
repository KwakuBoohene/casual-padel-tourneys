import type { MatchSet } from "@padel/shared";

/** Format one set line: `6–4` or `6–6 TB 7–5`. */
export function formatRegularSetScore(set: MatchSet): string {
  if (set.gamesA === 6 && set.gamesB === 6 && (set.tbA !== undefined || set.tbB !== undefined)) {
    return `6–6 TB ${set.tbA ?? 0}–${set.tbB ?? 0}`;
  }
  return `${set.gamesA}–${set.gamesB}`;
}

/** Join set lines for a spectator match card. */
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

/**
 * Spectator status line (AM 11):
 * - draft / in progress with games → `5–4 live`
 * - completed → `6–4` (no Done suffix)
 * - live round, no games yet → `Live`
 */
export function spectatorRegularStatusLine(input: {
  sets?: MatchSet[];
  completed: boolean;
  status: "live" | "next" | "completed" | "pending";
}): string {
  const score = formatRegularMatchScore(input.sets);
  if (input.completed && score) {
    return score;
  }
  if (score) {
    return `${score} live`;
  }
  if (input.status === "live") return "Live";
  if (input.status === "next") return "Next";
  if (input.status === "completed") return "Done";
  return "Pending";
}

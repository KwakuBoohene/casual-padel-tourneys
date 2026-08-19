import type { Match } from "../types/domain.js";

/**
 * A match the organizer closed the event without playing. Void matches keep whatever
 * partial score was entered but are never counted in standings or career credit, so the
 * night's history stays auditable without inventing results nobody played.
 */
export function isMatchVoided(match: Pick<Match, "voidedAt">): boolean {
  return match.voidedAt != null;
}

/** Still open at close time: neither completed nor already voided. */
export function isMatchUnfinished(match: Pick<Match, "completed" | "voidedAt">): boolean {
  return !match.completed && !isMatchVoided(match);
}

/** Contributes to standings, player aggregates and career deltas. */
export function isMatchCountable(match: Pick<Match, "completed" | "voidedAt">): boolean {
  return match.completed && !isMatchVoided(match);
}

/**
 * How many matches would be voided by closing now. Drives the organizer's pre-close
 * warning, so it must agree exactly with what the close use-case voids.
 */
export function countUnfinishedMatches(
  rounds: Array<{ matches: Array<Pick<Match, "completed" | "voidedAt">> }>
): number {
  let count = 0;
  for (const round of rounds) {
    for (const match of round.matches) {
      if (isMatchUnfinished(match)) count += 1;
    }
  }
  return count;
}

/** True when every match is either played or voided — i.e. the event has nothing left to play. */
export function areAllMatchesResolved(
  rounds: Array<{ matches: Array<Pick<Match, "completed" | "voidedAt">> }>
): boolean {
  return countUnfinishedMatches(rounds) === 0;
}

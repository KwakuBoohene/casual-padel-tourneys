/**
 * Copy for the close/finish confirmation. Kept pure so the wording — which must name the
 * exact number of matches being voided, and must say "matches" rather than "games" — is
 * unit-testable rather than buried in a sheet component.
 */

export function finishSheetTitle(isMexicano: boolean, unfinishedMatchCount: number): string {
  if (unfinishedMatchCount > 0) {
    return isMexicano ? "End night early?" : "Close tournament early?";
  }
  return isMexicano ? "End this Mexicano night?" : "Finish tournament?";
}

export function finishSheetMessage(unfinishedMatchCount: number): string {
  if (unfinishedMatchCount === 0) {
    return "Results will be locked.";
  }
  const noun = unfinishedMatchCount === 1 ? "match has" : "matches have";
  return `${unfinishedMatchCount} ${noun} not been played. Closing marks them void — they will not count towards standings or the account leaderboard. Scores already entered are kept.`;
}

export function finishPrimaryLabel(isMexicano: boolean, unfinishedMatchCount: number): string {
  if (unfinishedMatchCount > 0) {
    return "Close and void";
  }
  return isMexicano ? "End night" : "Finish";
}

export function finishOptionDetail(canFinish: boolean, unfinishedMatchCount: number): string {
  if (!canFinish) {
    return "Already ended";
  }
  if (unfinishedMatchCount === 0) {
    return "Lock results";
  }
  return `Void ${unfinishedMatchCount} unplayed match${unfinishedMatchCount === 1 ? "" : "es"}`;
}

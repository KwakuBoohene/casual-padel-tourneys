import type { MatchSet, RegularScoringConfig } from "@padel/shared";
import { evaluateMatch, evaluateSet } from "@padel/shared";

import type { LiveTournamentState } from "../../types/organizer/tournament";

export type RegularEntrySnapshot = {
  sets: MatchSet[];
  matchTbA?: number;
  matchTbB?: number;
};

function cloneSets(sets: MatchSet[]): MatchSet[] {
  return sets.map((set) => ({ ...set }));
}

export function isRegularTournament(tournament: LiveTournamentState): boolean {
  return (tournament.config.scoringMode ?? "AMERICANO_POINTS") === "REGULAR";
}

export function regularConfigOf(tournament: LiveTournamentState): RegularScoringConfig | null {
  if (!isRegularTournament(tournament) || !tournament.config.regularScoring) {
    return null;
  }
  return tournament.config.regularScoring;
}

export function initialRegularSets(tournament: LiveTournamentState, matchId: string): MatchSet[] {
  for (const round of tournament.rounds) {
    const match = round.matches.find((item) => item.id === matchId);
    if (match?.sets && match.sets.length > 0) {
      return cloneSets(match.sets);
    }
  }
  return [{ setNumber: 1, gamesA: 0, gamesB: 0 }];
}

export function currentSetIndex(sets: MatchSet[], config: RegularScoringConfig): number {
  for (let i = 0; i < sets.length; i += 1) {
    if (!evaluateSet(sets[i], config).complete) {
      return i;
    }
  }
  return Math.max(0, sets.length - 1);
}

export function isSetTiebreakMode(set: MatchSet, config: RegularScoringConfig): boolean {
  return (
    config.setFormat === "FULL_SET" &&
    config.gameWinBy === 2 &&
    set.gamesA === 6 &&
    set.gamesB === 6
  );
}

export function regularContextLine(sets: MatchSet[], config: RegularScoringConfig): string {
  const index = currentSetIndex(sets, config);
  const set = sets[index];
  const setLabel = `Set ${set?.setNumber ?? index + 1}`;
  if (set && isSetTiebreakMode(set, config)) {
    return `Regular scoring · ${setLabel} · tiebreak points`;
  }
  return `Regular scoring · ${setLabel} · games`;
}

export function regularDisplayScores(
  sets: MatchSet[],
  config: RegularScoringConfig
): { scoreA: number; scoreB: number } {
  const set = sets[currentSetIndex(sets, config)];
  if (!set) {
    return { scoreA: 0, scoreB: 0 };
  }
  if (isSetTiebreakMode(set, config)) {
    return { scoreA: set.tbA ?? 0, scoreB: set.tbB ?? 0 };
  }
  return { scoreA: set.gamesA, scoreB: set.gamesB };
}

export function regularMatchCanComplete(
  sets: MatchSet[],
  config: RegularScoringConfig,
  matchTb?: { a?: number; b?: number }
): boolean {
  return evaluateMatch(sets, config, matchTb).complete;
}

export function canIncrementRegularSide(
  sets: MatchSet[],
  config: RegularScoringConfig,
  side: "A" | "B"
): boolean {
  if (evaluateMatch(sets, config).complete) {
    return false;
  }
  const set = sets[currentSetIndex(sets, config)];
  if (!set || isSetTiebreakMode(set, config)) {
    return true;
  }
  if (evaluateSet(set, config).complete) {
    return false;
  }
  if (config.setFormat === "FULL_SET" && config.gameWinBy === 1) {
    if (evaluateSet(set, config).complete) {
      return false;
    }
    const next = {
      ...set,
      gamesA: side === "A" ? set.gamesA + 1 : set.gamesA,
      gamesB: side === "B" ? set.gamesB + 1 : set.gamesB
    };
    if (next.gamesA > 6 || next.gamesB > 6 || (next.gamesA === 6 && next.gamesB === 6)) {
      return false;
    }
  }
  return true;
}

export function applyRegularSideChange(
  snapshot: RegularEntrySnapshot,
  config: RegularScoringConfig,
  side: "A" | "B",
  nextValue: number
): RegularEntrySnapshot {
  const sets = cloneSets(
    snapshot.sets.length > 0 ? snapshot.sets : [{ setNumber: 1, gamesA: 0, gamesB: 0 }]
  );
  const index = currentSetIndex(sets, config);
  const set = { ...sets[index] };
  const value = Math.max(0, Math.trunc(nextValue));

  if (isSetTiebreakMode(set, config)) {
    if (side === "A") set.tbA = value;
    else set.tbB = value;
  } else if (side === "A") {
    set.gamesA = value;
  } else {
    set.gamesB = value;
  }
  sets[index] = set;

  return { sets, matchTbA: snapshot.matchTbA, matchTbB: snapshot.matchTbB };
}

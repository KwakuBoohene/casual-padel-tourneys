import type { MatchSet } from "@padel/shared";

import type { LiveTournamentState } from "../../types/organizer/tournament";
import {
  applyRegularSideChange,
  isRegularTournament,
  regularConfigOf,
  regularDisplayScores
} from "./regularScoreEntry";
import { beginNextRegularSet } from "./regularSetFlow";
import type { ScoreEntryState, ScorePair } from "./scoreEntryHelpers";

export function buildScoreEntryFromPair(
  tournament: LiveTournamentState,
  matchId: string,
  pair: ScorePair
): ScoreEntryState {
  return {
    matchId,
    scoringMode: isRegularTournament(tournament) ? "REGULAR" : "AMERICANO_POINTS",
    scoreA: pair.scoreA,
    scoreB: pair.scoreB,
    sets: pair.sets ?? [],
    matchTbA: pair.matchTbA,
    matchTbB: pair.matchTbB,
    undoStack: []
  };
}

export function nextScoreEntryAfterChange(
  prev: ScoreEntryState,
  tournament: LiveTournamentState,
  next: ScorePair & { sets: ScoreEntryState["sets"] }
): ScoreEntryState {
  const config = regularConfigOf(tournament);
  const regular = isRegularTournament(tournament);
  const snapshot: ScorePair = {
    scoreA: prev.scoreA,
    scoreB: prev.scoreB,
    sets: prev.sets,
    matchTbA: prev.matchTbA,
    matchTbB: prev.matchTbB
  };
  const display =
    regular && config
      ? regularDisplayScores(next.sets, config)
      : { scoreA: next.scoreA ?? 0, scoreB: next.scoreB ?? 0 };
  return {
    ...prev,
    undoStack: [...prev.undoStack, snapshot],
    scoreA: display.scoreA,
    scoreB: display.scoreB,
    sets: next.sets,
    matchTbA: next.matchTbA,
    matchTbB: next.matchTbB
  };
}

export function changeRegularSide(
  entry: ScoreEntryState,
  tournament: LiveTournamentState,
  side: "A" | "B",
  next: number
): (ScorePair & { sets: ScoreEntryState["sets"] }) | null {
  const config = regularConfigOf(tournament);
  if (!isRegularTournament(tournament) || !config) {
    return null;
  }
  const applied = applyRegularSideChange(
    { sets: entry.sets, matchTbA: entry.matchTbA, matchTbB: entry.matchTbB },
    config,
    side,
    next
  );
  return {
    ...applied,
    scoreA: side === "A" ? next : entry.scoreA,
    scoreB: side === "B" ? next : entry.scoreB
  };
}

export function restoreScoreEntryUndo(
  prev: ScoreEntryState,
  tournament: LiveTournamentState
): ScoreEntryState | null {
  if (!prev.undoStack.length) {
    return null;
  }
  const undoStack = [...prev.undoStack];
  const last = undoStack.pop()!;
  const config = regularConfigOf(tournament);
  const display =
    isRegularTournament(tournament) && config && last.sets
      ? regularDisplayScores(last.sets, config)
      : { scoreA: last.scoreA, scoreB: last.scoreB };
  return {
    ...prev,
    ...last,
    scoreA: display.scoreA,
    scoreB: display.scoreB,
    sets: last.sets ?? [],
    undoStack
  };
}

export function changeScoreEntrySide(
  entry: ScoreEntryState,
  tournament: LiveTournamentState,
  side: "A" | "B",
  next: number,
  points: number
): ScoreEntryState {
  const regularNext = changeRegularSide(entry, tournament, side, next);
  if (regularNext) {
    return nextScoreEntryAfterChange(entry, tournament, regularNext);
  }
  const clamp = (value: number) => Math.max(0, Math.min(points, value));
  const scoreA = side === "A" ? clamp(next) : clamp(points - clamp(next));
  const scoreB = side === "B" ? clamp(next) : clamp(points - clamp(next));
  return nextScoreEntryAfterChange(entry, tournament, { scoreA, scoreB, sets: [] });
}

export function advanceToNextRegularSet(
  entry: ScoreEntryState,
  tournament: LiveTournamentState,
  sets: MatchSet[] = entry.sets
): ScoreEntryState | null {
  const config = regularConfigOf(tournament);
  if (!config) return null;
  const advanced = beginNextRegularSet(
    { sets, matchTbA: entry.matchTbA, matchTbB: entry.matchTbB },
    config
  );
  if (!advanced) return null;
  return nextScoreEntryAfterChange(entry, tournament, {
    ...advanced,
    scoreA: 0,
    scoreB: 0
  });
}

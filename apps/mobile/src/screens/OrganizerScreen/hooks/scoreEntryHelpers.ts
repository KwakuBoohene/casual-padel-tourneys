import type { LiveTournamentState } from "../types";

import { findMatchInTournament, submitMatchScore } from "./scoreDraftActions";
import type { ScoreDraftMap } from "./useScoreDraftPersistence";

export type ScorePair = { scoreA: number; scoreB: number };

export type ScoreEntryState = {
  matchId: string;
  scoreA: number;
  scoreB: number;
  undoStack: ScorePair[];
};

export function initialScorePair(
  tournament: LiveTournamentState,
  matchId: string,
  drafts: ScoreDraftMap
): ScorePair {
  const match = findMatchInTournament(tournament, matchId);
  const draft = drafts[matchId];
  const points = tournament.config.pointsPerMatch;
  const parse = (raw: string | undefined, fallback: number | undefined) => {
    if (raw !== undefined && raw !== "" && Number.isFinite(Number(raw))) return Number(raw);
    if (fallback !== undefined) return fallback;
    return null;
  };
  const a = parse(draft?.scoreA, match?.scoreA);
  const b = parse(draft?.scoreB, match?.scoreB);
  if (a !== null && b !== null) return { scoreA: a, scoreB: b };
  if (a !== null) return { scoreA: a, scoreB: Math.max(0, points - a) };
  if (b !== null) return { scoreA: Math.max(0, points - b), scoreB: b };
  return { scoreA: 0, scoreB: points };
}

export function validateAmericanoScores(scoreA: number, scoreB: number, points: number): string | null {
  if (scoreA > points || scoreB > points) {
    return `Scores cannot exceed ${points} points.`;
  }
  if (scoreA + scoreB !== points) {
    return `Americano scores must add up to ${points} points.`;
  }
  return null;
}

export async function persistScoreEntry(input: {
  tournament: LiveTournamentState;
  matchId: string;
  scoreA: number;
  scoreB: number;
  onTournamentUpdated: (data: LiveTournamentState) => void;
  setScoreInputs: (updater: (previous: ScoreDraftMap) => ScoreDraftMap) => void;
}): Promise<void> {
  await submitMatchScore({
    tournament: input.tournament,
    matchId: input.matchId,
    scoreA: input.scoreA,
    scoreB: input.scoreB,
    onTournamentUpdated: input.onTournamentUpdated
  });
  input.setScoreInputs((previous) => {
    const next = { ...previous };
    delete next[input.matchId];
    return next;
  });
}


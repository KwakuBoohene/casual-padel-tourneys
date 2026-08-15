import type { MatchSet, ScoringMode } from "@padel/shared";

import type { LiveTournamentState } from "../../types/organizer/tournament";

import { findMatchInTournament, submitMatchScore, submitRegularMatchScore } from "./scoreDraftActions";
import {
  initialRegularSets,
  isRegularTournament,
  regularConfigOf,
  regularDisplayScores
} from "./regularScoreEntry";
import type { ScoreDraftMap } from "../../hooks/organizer/score/useScoreDraftPersistence";

export type ScorePair = {
  scoreA: number | null;
  scoreB: number | null;
  sets?: MatchSet[];
  matchTbA?: number;
  matchTbB?: number;
};

export type ScoreEntryState = {
  matchId: string;
  scoringMode: ScoringMode;
  scoreA: number | null;
  scoreB: number | null;
  sets: MatchSet[];
  matchTbA?: number;
  matchTbB?: number;
  undoStack: ScorePair[];
};

export function initialScorePair(
  tournament: LiveTournamentState,
  matchId: string,
  drafts: ScoreDraftMap
): ScorePair {
  if (isRegularTournament(tournament)) {
    const config = regularConfigOf(tournament)!;
    const sets = initialRegularSets(tournament, matchId);
    const display = regularDisplayScores(sets, config);
    const match = findMatchInTournament(tournament, matchId);
    return {
      scoreA: display.scoreA,
      scoreB: display.scoreB,
      sets,
      matchTbA: match?.matchTbA,
      matchTbB: match?.matchTbB
    };
  }

  const match = findMatchInTournament(tournament, matchId);
  const draft = drafts[matchId];
  const points = tournament.config.pointsPerMatch;
  const parse = (raw: string | undefined, fallback: number | undefined) => {
    if (raw !== undefined && raw.trim() !== "" && Number.isFinite(Number(raw))) return Number(raw);
    if (fallback !== undefined && Number.isFinite(fallback)) return fallback;
    return null;
  };
  const a = parse(draft?.scoreA, match?.scoreA);
  const b = parse(draft?.scoreB, match?.scoreB);
  if (a !== null && b !== null) return { scoreA: a, scoreB: b, sets: [] };
  if (a !== null) return { scoreA: a, scoreB: Math.max(0, points - a), sets: [] };
  if (b !== null) return { scoreA: Math.max(0, points - b), scoreB: b, sets: [] };
  return { scoreA: null, scoreB: null, sets: [] };
}

export function validateAmericanoScores(
  scoreA: number | null,
  scoreB: number | null,
  points: number
): string | null {
  if (scoreA === null && scoreB === null) {
    return "Enter scores for both teams before saving.";
  }
  if (scoreA === null) {
    return "Enter a score for the first team.";
  }
  if (scoreB === null) {
    return "Enter a score for the second team.";
  }
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

export async function persistRegularScoreEntry(input: {
  tournament: LiveTournamentState;
  matchId: string;
  sets: MatchSet[];
  complete: boolean;
  matchTbA?: number;
  matchTbB?: number;
  onTournamentUpdated: (data: LiveTournamentState) => void;
}): Promise<void> {
  await submitRegularMatchScore({
    tournament: input.tournament,
    matchId: input.matchId,
    sets: input.sets,
    status: input.complete ? "COMPLETE" : "DRAFT",
    matchTbA: input.matchTbA,
    matchTbB: input.matchTbB,
    onTournamentUpdated: input.onTournamentUpdated
  });
}

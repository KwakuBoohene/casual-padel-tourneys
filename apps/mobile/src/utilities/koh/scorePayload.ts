import type { KohGameWinMethod, RegularScoringConfig, SubmitKohScoreInput } from "@padel/shared";
import { evaluateMatch } from "@padel/shared";

export type KohScoreDraft = {
  gamesA: number;
  gamesB: number;
  tbA?: number;
  tbB?: number;
  winMethodsA: KohGameWinMethod[];
  winMethodsB: KohGameWinMethod[];
  undoStack: { gamesA: number; gamesB: number }[];
};

export function emptyKohScoreDraft(): KohScoreDraft {
  return {
    gamesA: 0,
    gamesB: 0,
    winMethodsA: [],
    winMethodsB: [],
    undoStack: []
  };
}

export function syncWinMethodLengths(draft: KohScoreDraft): KohScoreDraft {
  const pad = (methods: KohGameWinMethod[], count: number): KohGameWinMethod[] => {
    const next = methods.slice(0, count);
    while (next.length < count) next.push("REGULAR");
    return next;
  };
  return {
    ...draft,
    winMethodsA: pad(draft.winMethodsA, draft.gamesA),
    winMethodsB: pad(draft.winMethodsB, draft.gamesB)
  };
}

export function changeKohGames(
  draft: KohScoreDraft,
  side: "A" | "B",
  next: number
): KohScoreDraft {
  const clamped = Math.max(0, Math.min(99, next));
  const withUndo = {
    ...draft,
    undoStack: [...draft.undoStack, { gamesA: draft.gamesA, gamesB: draft.gamesB }]
  };
  const updated =
    side === "A"
      ? { ...withUndo, gamesA: clamped }
      : { ...withUndo, gamesB: clamped };
  return syncWinMethodLengths(updated);
}

export function undoKohGames(draft: KohScoreDraft): KohScoreDraft {
  if (draft.undoStack.length === 0) return draft;
  const stack = [...draft.undoStack];
  const prev = stack.pop()!;
  return syncWinMethodLengths({
    ...draft,
    gamesA: prev.gamesA,
    gamesB: prev.gamesB,
    undoStack: stack
  });
}

export function kohScoreCanComplete(
  draft: KohScoreDraft,
  config: RegularScoringConfig
): boolean {
  const evaluation = evaluateMatch(
    [
      {
        setNumber: 1,
        gamesA: draft.gamesA,
        gamesB: draft.gamesB,
        tbA: draft.tbA,
        tbB: draft.tbB
      }
    ],
    config
  );
  return evaluation.winner === "A" || evaluation.winner === "B";
}

export function buildKohScorePayload(
  draft: KohScoreDraft,
  expectedVersion: number,
  status: "DRAFT" | "COMPLETE",
  matchId?: string
): SubmitKohScoreInput {
  const synced = syncWinMethodLengths(draft);
  return {
    expectedVersion,
    status,
    matchId,
    sets: [
      {
        setNumber: 1,
        gamesA: synced.gamesA,
        gamesB: synced.gamesB,
        tbA: synced.tbA,
        tbB: synced.tbB,
        winMethodsA: synced.winMethodsA,
        winMethodsB: synced.winMethodsB
      }
    ]
  };
}

export function needsTiebreakPoints(draft: KohScoreDraft, config: RegularScoringConfig): boolean {
  return (
    config.setFormat === "FULL_SET" &&
    config.gameWinBy === 2 &&
    draft.gamesA === 7 &&
    draft.gamesB === 7
  );
}

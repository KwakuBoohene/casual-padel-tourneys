import { isKohDraftPayload, namedPlayers, startedPairs, type TournamentDraftPayload } from "@padel/shared";

import { ApiError } from "../../api/errors";
import type { Estimate } from "../../types/organizer/setup";

import { fromDraftPayload } from "./draftPayload";
import { computeEstimate } from "./estimateHelpers";

export interface DraftStartSummary {
  players: number;
  courts: number | null;
  /** Null for King of the Court and for invalid settings. */
  estimate: Estimate | null;
  /** Mexicano rounds are open-ended, so the estimate is a guide only. */
  approximate: boolean;
}

/** Numbers for the start confirmation (Figma 08), from the same estimator the wizard uses. */
export function draftStartSummary(payload: TournamentDraftPayload): DraftStartSummary {
  if (isKohDraftPayload(payload)) {
    const pairs = (payload.courtAssignments ?? []).reduce((sum, court) => sum + startedPairs(court.units).length, 0);
    return { players: pairs * 2, courts: payload.courts ?? null, estimate: null, approximate: false };
  }
  const teamMode = payload.variant === "TEAM";
  const players = teamMode ? startedPairs(payload.teams).length * 2 : namedPlayers(payload.players).length;
  const state = fromDraftPayload(payload);
  const estimate = computeEstimate({
    courtsText: state.courtsText,
    pointsText: state.pointsText,
    mode: state.mode,
    variant: state.variant,
    schedulingMode: state.schedulingMode,
    targetGamesText: state.targetGamesText,
    tournamentTimeText: state.tournamentTimeText,
    playersCount: players,
    scoringMode: state.scoringMode,
    regularSetsToWin: state.regularScoring.setsToWin
  });
  return { players, courts: payload.courts ?? null, estimate, approximate: state.mode === "MEXICANO" };
}

export type DraftStartFailure =
  | { kind: "conflict" }
  | { kind: "notReady"; message: string }
  | { kind: "gone"; message: string }
  | { kind: "failed"; message: string };

/** Map a `POST /drafts/:id/start` error onto what the sheet should do next. */
export function draftStartFailure(error: unknown): DraftStartFailure {
  if (!(error instanceof ApiError)) {
    return { kind: "failed", message: "Couldn't start the tournament. Check your connection and try again." };
  }
  if (error.code === "DRAFT_VERSION_CONFLICT") return { kind: "conflict" };
  if (error.code === "DRAFT_NOT_READY") return { kind: "notReady", message: error.message };
  if (error.status === 404 || error.status === 403) return draftLoadFailure(error);
  return { kind: "failed", message: error.message || "Couldn't start the tournament." };
}

/** A draft that can't be opened any more: deleted (404) or access removed (403). */
export function draftLoadFailure(error: unknown): { kind: "gone" | "failed"; message: string } {
  if (error instanceof ApiError && error.status === 404) {
    return { kind: "gone", message: "This draft was deleted or has already been removed." };
  }
  if (error instanceof ApiError && error.status === 403) {
    return { kind: "gone", message: "You no longer have access to this draft." };
  }
  return { kind: "failed", message: (error as Error)?.message || "Couldn't load this draft." };
}

/** "Ama and Sam keep live control after start." etc. */
export function keepAccessLine(names: string[], keepAccess: boolean): string | null {
  if (names.length === 0) return null;
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return keepAccess
    ? `${who} ${names.length === 1 ? "keeps" : "keep"} live control after it starts.`
    : `${who} ${names.length === 1 ? "loses" : "lose"} access once it starts.`;
}

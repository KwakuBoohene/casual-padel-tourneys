import type { KohCourtChange, KohGameWinMethod } from "@padel/shared";

import {
  pickKohPromotion,
  submitKohCourtScore,
  swapKohCourt,
  endKohTournament
} from "../../api/koh";
import { isEmailVerifyRequired } from "../../api/errors";
import type { KohTournamentHub } from "../../types/koh/create";
import {
  buildKohScorePayload,
  changeKohGames,
  emptyKohScoreDraft,
  kohScoreCanComplete,
  syncWinMethodLengths,
  undoKohGames,
  type KohScoreDraft
} from "../../utilities/koh/scorePayload";

export async function runKohScoreSave(input: {
  hub: KohTournamentHub;
  courtId: string;
  draft: KohScoreDraft;
  status: "DRAFT" | "COMPLETE";
  matchId?: string;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}): Promise<KohTournamentHub | null> {
  try {
    input.setErrorText("");
    return await submitKohCourtScore(
      input.hub.id,
      input.courtId,
      buildKohScorePayload(input.draft, input.hub.version, input.status, input.matchId)
    );
  } catch (error) {
    if (isEmailVerifyRequired(error)) {
      input.markEmailVerifyRequired(error.verifyBy);
      return null;
    }
    input.setErrorText((error as Error).message);
    return null;
  }
}

export async function runKohSwap(input: {
  hub: KohTournamentHub;
  courtId: string;
  slot: "KING" | "CHALLENGER";
  withUnitId: string;
  reason: string;
  permanent?: boolean;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}): Promise<KohTournamentHub | null> {
  try {
    return await swapKohCourt(input.hub.id, input.courtId, {
      slot: input.slot,
      withUnitId: input.withUnitId,
      reason: input.reason,
      permanent: input.permanent,
      expectedVersion: input.hub.version
    });
  } catch (error) {
    if (isEmailVerifyRequired(error)) {
      input.markEmailVerifyRequired(error.verifyBy);
      return null;
    }
    input.setErrorText((error as Error).message);
    return null;
  }
}

export async function runKohPromotePick(input: {
  hub: KohTournamentHub;
  demotedUnitId: string;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}): Promise<KohTournamentHub | null> {
  try {
    return await pickKohPromotion(input.hub.id, {
      demotedUnitId: input.demotedUnitId,
      expectedVersion: input.hub.version
    });
  } catch (error) {
    if (isEmailVerifyRequired(error)) {
      input.markEmailVerifyRequired(error.verifyBy);
      return null;
    }
    input.setErrorText((error as Error).message);
    return null;
  }
}

export async function runKohEnd(input: {
  hub: KohTournamentHub;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}): Promise<KohTournamentHub | null> {
  try {
    return await endKohTournament(input.hub.id, input.hub.version);
  } catch (error) {
    if (isEmailVerifyRequired(error)) {
      input.markEmailVerifyRequired(error.verifyBy);
      return null;
    }
    input.setErrorText((error as Error).message);
    return null;
  }
}

export function queueCourtChange(
  change: KohCourtChange | null,
  scoreUiOpen: boolean,
  setPending: (value: KohCourtChange | null) => void,
  setQueued: (value: KohCourtChange | null) => void
): void {
  if (!change) return;
  if (scoreUiOpen) setQueued(change);
  else setPending(change);
}

export {
  changeKohGames,
  emptyKohScoreDraft,
  kohScoreCanComplete,
  syncWinMethodLengths,
  undoKohGames
};
export type { KohScoreDraft, KohGameWinMethod };

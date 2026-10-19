import { router } from "expo-router";

import { apiPost } from "../../api/client";
import type { LiveTournamentState } from "../../types/organizer/tournament";
import { tournamentLeaderboardPath } from "./tournamentRoutes";

interface CloseTournamentResponse {
  data: { tournament: LiveTournamentState; voidedMatchCount: number };
}

function isVersionConflict(message: string): boolean {
  return /version mismatch/i.test(message);
}

/**
 * Close a live event in any mode. Unplayed matches are voided server-side, so this no longer
 * needs the tournament to be fully scored first.
 */
export async function finishLiveTournament(input: {
  liveTournament: LiveTournamentState;
  canFinishNight: boolean;
  applyTournamentUpdate: (data: LiveTournamentState) => void;
  setIsEditingCompletedTournament: (value: boolean) => void;
  setErrorText: (value: string) => void;
}): Promise<void> {
  const { liveTournament, setErrorText } = input;
  if (!input.canFinishNight) {
    setErrorText("This event has already ended.");
    return;
  }

  try {
    setErrorText("");
    const response = await apiPost<CloseTournamentResponse>(
      `/tournaments/${liveTournament.id}/close`,
      { expectedVersion: liveTournament.version }
    );
    input.applyTournamentUpdate(response.data.tournament);
    input.setIsEditingCompletedTournament(false);
    router.replace(tournamentLeaderboardPath(liveTournament.id));
  } catch (error) {
    const message = (error as Error).message;
    setErrorText(
      isVersionConflict(message)
        ? "This event changed on another device. Refresh and try again."
        : message
    );
  }
}

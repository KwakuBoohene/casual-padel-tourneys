import type { QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { apiPost } from "../../api/client";
import type { LiveTournamentState, TournamentResponse } from "../../types/organizer/tournament";
import { syncTournamentCaches } from "./tournamentQueryCache";
import { tournamentLeaderboardPath } from "./tournamentRoutes";

export async function finishLiveTournament(input: {
  liveTournament: LiveTournamentState;
  canFinishNight: boolean;
  queryClient: QueryClient;
  applyTournamentUpdate: (data: LiveTournamentState) => void;
  setIsEditingCompletedTournament: (value: boolean) => void;
  setErrorText: (value: string) => void;
}): Promise<void> {
  const { liveTournament, setErrorText } = input;
  if (!input.canFinishNight) {
    setErrorText(
      liveTournament.config.mode === "MEXICANO"
        ? "This Mexicano night has already ended."
        : "Finish is only available after all round matches have scores."
    );
    return;
  }
  if (liveTournament.config.mode === "MEXICANO") {
    try {
      setErrorText("");
      const response = await apiPost<TournamentResponse>("/tournaments/end-night", {
        tournamentId: liveTournament.id,
        expectedVersion: liveTournament.version
      });
      input.applyTournamentUpdate(response.data);
      input.setIsEditingCompletedTournament(false);
      router.replace(tournamentLeaderboardPath(liveTournament.id));
    } catch (error) {
      setErrorText((error as Error).message);
    }
    return;
  }
  syncTournamentCaches(input.queryClient, liveTournament);
  input.setIsEditingCompletedTournament(false);
  router.replace(tournamentLeaderboardPath(liveTournament.id));
}

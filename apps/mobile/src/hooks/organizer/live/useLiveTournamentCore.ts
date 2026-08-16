import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { isEmailVerifyRequired } from "../../../api/errors";
import type { LiveTournamentState } from "../../../types/organizer/tournament";
import { syncTournamentCaches } from "../../../utilities/organizer/tournamentQueryCache";
import { tournamentQueryKeys } from "../../../utilities/organizer/tournamentQueryKeys";
import { fetchTournamentDetail } from "../../../utilities/organizer/tournamentQueries";

export interface UseLiveTournamentCoreParams {
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
}

export function useLiveTournamentCore({
  setErrorText,
  markEmailVerifyRequired
}: UseLiveTournamentCoreParams) {
  const queryClient = useQueryClient();
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [liveTournamentNameDraft, setLiveTournamentNameDraft] = useState("");
  const [proposedCourts, setProposedCourts] = useState(2);
  const [isEditingCompletedTournament, setIsEditingCompletedTournament] = useState(false);

  const detailQuery = useQuery({
    queryKey: tournamentQueryKeys.detail(activeTournamentId ?? ""),
    queryFn: () => fetchTournamentDetail(activeTournamentId!),
    enabled: Boolean(activeTournamentId)
  });

  const liveTournament = detailQuery.data ?? null;

  const clampProposedCourts = (playersCount: number) => {
    setProposedCourts((previous) => {
      const nextMax = Math.max(1, Math.floor(playersCount / 4));
      return Math.min(Math.max(1, previous), nextMax);
    });
  };

  const applyTournamentUpdate = (data: LiveTournamentState) => {
    syncTournamentCaches(queryClient, data);
    setActiveTournamentId(data.id);
    setLiveTournamentNameDraft(data.config.name);
  };

  const adoptTournament = (data: LiveTournamentState, editMode: boolean) => {
    syncTournamentCaches(queryClient, data);
    setActiveTournamentId(data.id);
    setProposedCourts(
      Math.min(Math.max(1, data.config.courts), Math.max(1, Math.floor(data.players.length / 4)))
    );
    setLiveTournamentNameDraft(data.config.name);
    setIsEditingCompletedTournament(editMode);
  };

  const setLiveTournament = (data: LiveTournamentState | null) => {
    if (!data) {
      setActiveTournamentId(null);
      return;
    }
    syncTournamentCaches(queryClient, data);
    setActiveTournamentId(data.id);
  };

  const openTournament = async (
    tournamentId: string,
    editMode = false
  ): Promise<"live" | "leaderboard" | "needs_koh" | "error"> => {
    try {
      setErrorText("");
      const data = await queryClient.fetchQuery({
        queryKey: tournamentQueryKeys.detail(tournamentId),
        queryFn: () => fetchTournamentDetail(tournamentId)
      });
      if (data.config.mode === "KING_OF_THE_HILL") return "needs_koh";
      adoptTournament(data, editMode);
      if (data.config.mode === "MEXICANO" && data.endedAt) return "leaderboard";
      return "live";
    } catch (error) {
      if (isEmailVerifyRequired(error)) {
        markEmailVerifyRequired(error.verifyBy);
        return "error";
      }
      setErrorText((error as Error).message);
      return "error";
    }
  };

  const refreshTournament = async () => {
    if (!activeTournamentId) return;
    try {
      const data = (await detailQuery.refetch()).data;
      if (!data) return;
      applyTournamentUpdate(data);
      clampProposedCourts(data.players.length);
      if (!data.rounds.every((round) => round.matches.every((match) => match.completed))) {
        setIsEditingCompletedTournament(false);
      }
    } catch (error) {
      setErrorText((error as Error).message);
    }
  };

  return {
    liveTournament,
    setLiveTournament,
    liveTournamentNameDraft,
    setLiveTournamentNameDraft,
    proposedCourts,
    setProposedCourts,
    isEditingCompletedTournament,
    setIsEditingCompletedTournament,
    clampProposedCourts,
    applyTournamentUpdate,
    adoptTournament,
    openTournament,
    refreshTournament
  };
}

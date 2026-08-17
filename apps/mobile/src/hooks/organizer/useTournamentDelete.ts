import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiDelete } from "../../api/client";
import { removeTournamentCaches } from "../../utilities/organizer/tournamentQueryCache";
import { tournamentQueryKeys } from "../../utilities/organizer/tournamentQueryKeys";

export function deleteTournamentUrl(tournamentId: string, stripCareer?: boolean): string {
  if (stripCareer === undefined) return `/tournaments/${tournamentId}`;
  return `/tournaments/${tournamentId}?removeFromCareerLeaderboard=${stripCareer ? "true" : "false"}`;
}

export function useTournamentDelete(onDeleted: (tournamentId: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tournamentId: string; stripCareer?: boolean }) =>
      apiDelete<{ ok: boolean }>(deleteTournamentUrl(input.tournamentId, input.stripCareer)),
    onSuccess: (_data, input) => {
      removeTournamentCaches(queryClient, input.tournamentId);
      void queryClient.invalidateQueries({ queryKey: tournamentQueryKeys.playerSuggestions() });
      onDeleted(input.tournamentId);
    }
  });
}

import type { QueryClient } from "@tanstack/react-query";

import type { LiveTournamentState } from "../../types/organizer/tournament";

import { tournamentQueryKeys } from "./tournamentQueryKeys";

export function setTournamentDetail(queryClient: QueryClient, tournament: LiveTournamentState): void {
  queryClient.setQueryData(tournamentQueryKeys.detail(tournament.id), tournament);
}

export function removeTournamentDetail(queryClient: QueryClient, tournamentId: string): void {
  queryClient.removeQueries({ queryKey: tournamentQueryKeys.detail(tournamentId) });
}

export function upsertTournamentInList(
  queryClient: QueryClient,
  tournament: LiveTournamentState
): void {
  queryClient.setQueryData<LiveTournamentState[]>(tournamentQueryKeys.list(), (previous) => {
    if (!previous) {
      return [tournament];
    }
    const index = previous.findIndex((item) => item.id === tournament.id);
    if (index === -1) {
      return [tournament, ...previous];
    }
    const next = [...previous];
    next[index] = tournament;
    return next;
  });
}

export function removeTournamentFromList(queryClient: QueryClient, tournamentId: string): void {
  queryClient.setQueryData<LiveTournamentState[]>(tournamentQueryKeys.list(), (previous) =>
    (previous ?? []).filter((item) => item.id !== tournamentId)
  );
}

/** Keep list row and detail cache aligned after server / WS updates. */
export function syncTournamentCaches(
  queryClient: QueryClient,
  tournament: LiveTournamentState
): void {
  setTournamentDetail(queryClient, tournament);
  upsertTournamentInList(queryClient, tournament);
}

export function removeTournamentCaches(queryClient: QueryClient, tournamentId: string): void {
  removeTournamentDetail(queryClient, tournamentId);
  removeTournamentFromList(queryClient, tournamentId);
}

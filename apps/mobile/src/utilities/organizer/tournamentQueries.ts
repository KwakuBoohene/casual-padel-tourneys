import { apiGet } from "../../api/client";
import type { TournamentListResponse, TournamentResponse } from "../../types/organizer/tournament";

export async function fetchTournamentList() {
  const response = await apiGet<TournamentListResponse>("/tournaments");
  return response.data;
}

export async function fetchTournamentDetail(tournamentId: string) {
  const response = await apiGet<TournamentResponse>(`/tournaments/${tournamentId}`);
  return response.data;
}

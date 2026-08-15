import { apiGet, apiPost, apiPut } from "./client";
import type { KohTournamentHub } from "../types/koh/create";
import type { AssignKohCourtsInput, CreateKohTournamentInput } from "@padel/shared";

export async function createKohTournament(payload: CreateKohTournamentInput): Promise<KohTournamentHub> {
  const response = await apiPost<{ data: KohTournamentHub }>("/tournaments", payload);
  return response.data;
}

export async function assignKohCourts(
  tournamentId: string,
  payload: AssignKohCourtsInput
): Promise<KohTournamentHub> {
  const response = await apiPut<{ data: KohTournamentHub }>(
    `/koh/tournaments/${tournamentId}/assignment`,
    payload
  );
  return response.data;
}

export async function getKohHub(tournamentId: string): Promise<KohTournamentHub> {
  const response = await apiGet<{ data: KohTournamentHub }>(`/koh/tournaments/${tournamentId}`);
  return response.data;
}

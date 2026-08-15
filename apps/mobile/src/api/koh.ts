import { apiGet, apiPost, apiPut } from "./client";
import type { KohTournamentHub } from "../types/koh/create";
import type {
  AssignKohCourtsInput,
  CreateKohTournamentInput,
  KohRankingsBoard,
  PromoteKohPickInput,
  RenameKohPlayerInput,
  ReplaceKohPartnerInput,
  SubmitKohScoreInput,
  SwapKohUnitInput
} from "@padel/shared";

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

export async function getKohRankings(
  tournamentId: string,
  courtNumber?: number
): Promise<KohRankingsBoard> {
  const query =
    courtNumber !== undefined ? `?courtNumber=${encodeURIComponent(String(courtNumber))}` : "";
  const response = await apiGet<{ data: KohRankingsBoard }>(
    `/koh/tournaments/${tournamentId}/rankings${query}`
  );
  return response.data;
}

export async function submitKohCourtScore(
  tournamentId: string,
  courtId: string,
  payload: SubmitKohScoreInput
): Promise<KohTournamentHub> {
  const response = await apiPost<{ data: KohTournamentHub }>(
    `/koh/tournaments/${tournamentId}/courts/${courtId}/score`,
    payload
  );
  return response.data;
}

export async function swapKohCourt(
  tournamentId: string,
  courtId: string,
  payload: SwapKohUnitInput
): Promise<KohTournamentHub> {
  const response = await apiPost<{ data: KohTournamentHub }>(
    `/koh/tournaments/${tournamentId}/courts/${courtId}/swap`,
    payload
  );
  return response.data;
}

export async function pickKohPromotion(
  tournamentId: string,
  payload: PromoteKohPickInput
): Promise<KohTournamentHub> {
  const response = await apiPost<{ data: KohTournamentHub }>(
    `/koh/tournaments/${tournamentId}/promote/pick`,
    payload
  );
  return response.data;
}

export async function renameKohPlayer(
  tournamentId: string,
  playerId: string,
  payload: RenameKohPlayerInput
): Promise<KohTournamentHub> {
  const response = await apiPost<{ data: KohTournamentHub }>(
    `/koh/tournaments/${tournamentId}/players/${playerId}/rename`,
    payload
  );
  return response.data;
}

export async function replaceKohPartner(
  tournamentId: string,
  unitId: string,
  payload: ReplaceKohPartnerInput
): Promise<KohTournamentHub> {
  const response = await apiPost<{ data: KohTournamentHub }>(
    `/koh/tournaments/${tournamentId}/units/${unitId}/replace-partner`,
    payload
  );
  return response.data;
}

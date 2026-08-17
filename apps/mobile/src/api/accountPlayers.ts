import { apiGet, apiPost } from "./client";
import type {
  OrganizerManagedPlayer,
  OrganizerPlayerDetail,
  OrganizerPlayerLeaderboard,
  OrganizerPlayerRange,
  OrganizerPlayerStatus
} from "@padel/shared";

export async function getAccountPlayerLeaderboard(
  range: OrganizerPlayerRange
): Promise<OrganizerPlayerLeaderboard & { guest?: boolean; message?: string }> {
  const response = await apiGet<{
    data: OrganizerPlayerLeaderboard & { guest?: boolean; message?: string };
  }>(`/me/players/leaderboard?range=${encodeURIComponent(range)}`);
  return response.data;
}

export async function getAccountPlayerDetail(
  playerId: string,
  range: OrganizerPlayerRange
): Promise<OrganizerPlayerDetail> {
  const response = await apiGet<{ data: OrganizerPlayerDetail }>(
    `/me/players/${playerId}?range=${encodeURIComponent(range)}`
  );
  return response.data;
}

export async function listManagedPlayers(
  status: OrganizerPlayerStatus
): Promise<{
  status?: OrganizerPlayerStatus;
  players: OrganizerManagedPlayer[];
  guest?: boolean;
  message?: string;
}> {
  const response = await apiGet<{
    data: {
      status?: OrganizerPlayerStatus;
      players: OrganizerManagedPlayer[];
      guest?: boolean;
      message?: string;
    };
  }>(`/me/players?status=${encodeURIComponent(status)}`);
  return response.data;
}

export async function archiveAccountPlayer(playerId: string): Promise<{ id: string; name: string }> {
  const response = await apiPost<{ data: { id: string; name: string } }>(
    `/me/players/${playerId}/archive`,
    {}
  );
  return response.data;
}

export async function unarchiveAccountPlayer(playerId: string): Promise<{ id: string; name: string }> {
  const response = await apiPost<{ data: { id: string; name: string } }>(
    `/me/players/${playerId}/unarchive`,
    {}
  );
  return response.data;
}

export async function mergeAccountPlayers(input: {
  playerIdA: string;
  playerIdB: string;
  survivingName: string;
}): Promise<{ id: string; name: string }> {
  const response = await apiPost<{ data: { id: string; name: string } }>("/me/players/merge", input);
  return response.data;
}

export async function renameAccountPlayer(
  playerId: string,
  name: string
): Promise<{ id: string; name: string }> {
  const response = await apiPost<{ data: { id: string; name: string } }>(
    `/me/players/${playerId}/rename`,
    { name }
  );
  return response.data;
}

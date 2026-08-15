import { apiGet } from "./client";
import type {
  OrganizerPlayerDetail,
  OrganizerPlayerLeaderboard,
  OrganizerPlayerRange
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

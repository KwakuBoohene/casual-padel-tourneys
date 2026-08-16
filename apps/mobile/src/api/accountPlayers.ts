import { buildOrganizerPlayerLeaderboardQuery } from "@padel/shared";
import type {
  OrganizerPlayerDetail,
  OrganizerPlayerLeaderboard,
  OrganizerPlayerLeaderboardMode,
  OrganizerPlayerRange
} from "@padel/shared";

import { apiGet } from "./client";

export interface AccountPlayerLeaderboardParams {
  range: OrganizerPlayerRange;
  mode?: OrganizerPlayerLeaderboardMode;
  q?: string;
}

export async function getAccountPlayerLeaderboard(
  params: AccountPlayerLeaderboardParams
): Promise<OrganizerPlayerLeaderboard & { guest?: boolean; message?: string }> {
  const query = buildOrganizerPlayerLeaderboardQuery({
    range: params.range,
    mode: params.mode ?? "overall",
    q: params.q
  });
  const response = await apiGet<{
    data: OrganizerPlayerLeaderboard & { guest?: boolean; message?: string };
  }>(`/me/players/leaderboard?${query}`);
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

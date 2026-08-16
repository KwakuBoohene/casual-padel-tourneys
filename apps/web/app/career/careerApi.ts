import {
  buildOrganizerPlayerLeaderboardQuery,
  type OrganizerPlayerLeaderboard,
  type OrganizerPlayerLeaderboardMode,
  type OrganizerPlayerRange
} from "@padel/shared";

const defaultApi = "http://localhost:3004";

export function getPublicApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL ?? defaultApi;
}

export const ORGANIZER_TOKEN_STORAGE_KEY = "padel-organizer-jwt";

export interface CareerLeaderboardParams {
  range: OrganizerPlayerRange;
  mode?: OrganizerPlayerLeaderboardMode;
  q?: string;
  token: string;
}

export async function fetchCareerLeaderboard(
  params: CareerLeaderboardParams
): Promise<OrganizerPlayerLeaderboard & { guest?: boolean; message?: string }> {
  const query = buildOrganizerPlayerLeaderboardQuery({
    range: params.range,
    mode: params.mode ?? "overall",
    q: params.q
  });
  const response = await fetch(`${getPublicApiBaseUrl()}/me/players/leaderboard?${query}`, {
    headers: { Authorization: `Bearer ${params.token}` },
    cache: "no-store"
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed (${response.status})`);
  }
  const payload = (await response.json()) as {
    data: OrganizerPlayerLeaderboard & { guest?: boolean; message?: string };
  };
  return payload.data;
}

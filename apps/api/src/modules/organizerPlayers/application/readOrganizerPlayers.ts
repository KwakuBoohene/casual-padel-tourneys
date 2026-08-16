import type {
  OrganizerPlayerDetail,
  OrganizerPlayerLeaderboard,
  OrganizerPlayerLeaderboardQuery
} from "@padel/shared";

import { rangeStart } from "../domain/careerRange.js";
import { buildDetail, buildLeaderboard } from "../domain/careerStats.js";
import type { OrganizerPlayersDeps } from "./ports.js";

export async function getOrganizerPlayerLeaderboard(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  query: OrganizerPlayerLeaderboardQuery
): Promise<OrganizerPlayerLeaderboard> {
  const deltas = await deps.repo.listDeltas({
    organizerId,
    since: rangeStart(query.range),
    mode: query.mode,
    q: query.q
  });
  return buildLeaderboard(query.range, deltas, { mode: query.mode, q: query.q });
}

/** `null` when the career identity does not belong to this organizer. */
export async function getOrganizerPlayerDetail(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  organizerPlayerId: string,
  query: Pick<OrganizerPlayerLeaderboardQuery, "range">
): Promise<OrganizerPlayerDetail | null> {
  const player = await deps.repo.findPlayer(organizerId, organizerPlayerId);
  if (!player) return null;

  const deltas = await deps.repo.listDeltas({
    organizerId,
    organizerPlayerId,
    since: rangeStart(query.range)
  });
  return buildDetail(player, query.range, deltas);
}

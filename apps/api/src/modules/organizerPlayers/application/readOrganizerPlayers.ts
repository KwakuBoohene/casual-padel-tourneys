import type {
  OrganizerPlayerDetail,
  OrganizerPlayerLeaderboard,
  OrganizerPlayerRange
} from "@padel/shared";

import { rangeStart } from "../domain/careerRange.js";
import { buildDetail, buildLeaderboard } from "../domain/careerStats.js";
import type { OrganizerPlayersDeps } from "./ports.js";

export async function getOrganizerPlayerLeaderboard(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  range: OrganizerPlayerRange
): Promise<OrganizerPlayerLeaderboard> {
  const deltas = await deps.repo.listDeltas({ organizerId, since: rangeStart(range) });
  return buildLeaderboard(range, deltas);
}

/** `null` when the career identity does not belong to this organizer. */
export async function getOrganizerPlayerDetail(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  organizerPlayerId: string,
  range: OrganizerPlayerRange
): Promise<OrganizerPlayerDetail | null> {
  const player = await deps.repo.findPlayer(organizerId, organizerPlayerId);
  if (!player) return null;

  const deltas = await deps.repo.listDeltas({
    organizerId,
    organizerPlayerId,
    since: rangeStart(range)
  });
  return buildDetail(player, range, deltas);
}

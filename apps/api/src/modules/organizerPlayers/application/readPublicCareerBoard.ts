import type { OrganizerPlayerRange, PublicCareerBoard } from "@padel/shared";

import type { OrganizerPlayersDeps } from "./ports.js";
import { getOrganizerPlayerLeaderboard } from "./readOrganizerPlayers.js";

/**
 * Resolve a share token to its organizer's standings. Returns `null` for an unknown or revoked
 * token so the caller can 404 without hinting that the account exists.
 *
 * Deliberately reuses the authenticated board builder: the public view can then never drift from
 * what the organizer sees, and archived identities stay excluded for free.
 */
export async function readPublicCareerBoard(
  deps: OrganizerPlayersDeps,
  token: string,
  range: OrganizerPlayerRange
): Promise<PublicCareerBoard | null> {
  const organizer = await deps.repo.findOrganizerByShareToken(token);
  if (!organizer) {
    return null;
  }
  const board = await getOrganizerPlayerLeaderboard(deps, organizer.id, range);
  return {
    organizerName: organizer.name,
    range,
    // Identity ids are stripped: nothing on this page needs them, and leaving them out keeps a
    // visitor from probing the authenticated per-player routes.
    rows: board.rows.map(({ id: _id, ...row }) => row)
  };
}

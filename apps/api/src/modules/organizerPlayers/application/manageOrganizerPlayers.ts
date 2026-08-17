import type { OrganizerManagedPlayer, OrganizerPlayerStatus } from "@padel/shared";

import type { OrganizerPlayersDeps } from "./ports.js";

export async function listManagedOrganizerPlayers(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  status: OrganizerPlayerStatus
): Promise<OrganizerManagedPlayer[]> {
  return deps.repo.listManaged(organizerId, status);
}

export async function archiveOrganizerPlayer(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  organizerPlayerId: string
): Promise<{ id: string; name: string }> {
  return deps.repo.archivePlayer(organizerId, organizerPlayerId);
}

export async function unarchiveOrganizerPlayer(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  organizerPlayerId: string
): Promise<{ id: string; name: string }> {
  return deps.repo.unarchivePlayer(organizerId, organizerPlayerId);
}

export async function mergeOrganizerPlayers(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  input: { playerIdA: string; playerIdB: string; survivingName: string }
): Promise<{ id: string; name: string }> {
  return deps.repo.mergePlayers({ organizerId, ...input });
}

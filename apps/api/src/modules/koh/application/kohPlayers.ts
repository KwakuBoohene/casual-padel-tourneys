import type { RenameKohPlayerInput, ReplaceKohPartnerInput } from "@padel/shared";

import type { KohTournamentHub } from "../domain/types.js";
import type { KohModuleDeps } from "./ports.js";

export async function renameKohPlayer(
  deps: KohModuleDeps,
  input: {
    tournamentId: string;
    organizerId: string;
    playerId: string;
    rename: RenameKohPlayerInput;
  }
): Promise<KohTournamentHub> {
  const hub = await deps.repo.renamePlayer(
    input.tournamentId,
    input.organizerId,
    input.playerId,
    input.rename
  );
  await deps.events.publish({ type: "KOH_HUB_UPDATED", tournamentId: hub.id, payload: hub });
  return hub;
}

export async function replaceKohPartner(
  deps: KohModuleDeps,
  input: {
    tournamentId: string;
    organizerId: string;
    unitId: string;
    replacement: ReplaceKohPartnerInput;
  }
): Promise<KohTournamentHub> {
  const hub = await deps.repo.replacePartner(
    input.tournamentId,
    input.organizerId,
    input.unitId,
    input.replacement
  );
  await deps.events.publish({ type: "KOH_HUB_UPDATED", tournamentId: hub.id, payload: hub });
  return hub;
}

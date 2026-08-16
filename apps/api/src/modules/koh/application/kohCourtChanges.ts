import type { PromoteKohPickInput, SwapKohUnitInput } from "@padel/shared";

import type { KohTournamentHub } from "../domain/types.js";
import type { KohModuleDeps } from "./ports.js";

export async function swapKohSlot(
  deps: KohModuleDeps,
  input: {
    tournamentId: string;
    organizerId: string;
    courtId: string;
    swap: SwapKohUnitInput;
  }
): Promise<KohTournamentHub> {
  const hub = await deps.repo.swapSlot(
    input.tournamentId,
    input.organizerId,
    input.courtId,
    input.swap
  );
  await deps.events.publish({
    type: "KOH_SWAP_APPLIED",
    tournamentId: hub.id,
    payload: hub
  });
  return hub;
}

export async function pickKohPromotion(
  deps: KohModuleDeps,
  input: { tournamentId: string; organizerId: string; pick: PromoteKohPickInput }
): Promise<KohTournamentHub> {
  const hub = await deps.repo.pickPromotion(input.tournamentId, input.organizerId, input.pick);
  await deps.events.publish({
    type: "KOH_COURT_CHANGE",
    tournamentId: hub.id,
    payload: hub
  });
  return hub;
}

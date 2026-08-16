import type { AssignKohCourtsInput } from "@padel/shared";

import { validation } from "../../../shared/kernel/appError.js";
import type { KohTournamentHub } from "../domain/types.js";
import type { KohModuleDeps } from "./ports.js";

export async function assignKohCourts(
  deps: KohModuleDeps,
  input: { tournamentId: string; organizerId: string; assignment: AssignKohCourtsInput }
): Promise<KohTournamentHub> {
  for (const court of input.assignment.courts) {
    if (court.units.length === 1) {
      throw validation("A court needs 0 (empty) or at least 2 doubles units.");
    }
  }
  const hub = await deps.repo.assignCourts(
    input.tournamentId,
    input.organizerId,
    input.assignment
  );
  await deps.events.publish({
    type: "KOH_ASSIGNMENT_UPDATED",
    tournamentId: hub.id,
    payload: hub
  });
  return hub;
}

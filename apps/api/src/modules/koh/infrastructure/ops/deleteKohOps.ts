import { logger } from "../../../../lib/logger.js";
import { hardDeleteTournament } from "../../../tournament/infrastructure/hardDeleteTournament.js";

import { requireKohTournament } from "./loadKohOps.js";

/** Hard-delete a King of the Court event the organizer owns (including ended nights). */
export async function deleteKohTournament(
  tournamentId: string,
  organizerId: string,
  options?: { stripCareer?: boolean }
): Promise<void> {
  await requireKohTournament(tournamentId, organizerId);
  logger.debug("koh/deleteKohTournament", { tournamentId, organizerId });
  await hardDeleteTournament(tournamentId, options?.stripCareer === true);
}

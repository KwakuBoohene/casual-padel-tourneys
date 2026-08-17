import { logger } from "../../../../lib/logger.js";
import { prisma } from "../../../../lib/prisma.js";

import { requireKohTournament } from "./loadKohOps.js";

/** Hard-delete a King of the Court event the organizer owns (including ended nights). */
export async function deleteKohTournament(tournamentId: string, organizerId: string): Promise<void> {
  await requireKohTournament(tournamentId, organizerId);
  logger.debug("koh/deleteKohTournament", { tournamentId, organizerId });
  await prisma.tournament.delete({ where: { id: tournamentId } });
}

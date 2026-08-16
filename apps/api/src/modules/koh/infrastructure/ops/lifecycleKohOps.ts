import { Prisma } from "@prisma/client";

import { logger } from "../../../../lib/logger.js";
import { prisma } from "../../../../lib/prisma.js";
import type { KohTournamentHub } from "../../domain/types.js";
import { getKohHub, requireKohTournament } from "./loadKohOps.js";
import { assertKohVersion } from "./kohVersion.js";

/** Mark the KOH night finished — blocks further live mutations. */
export async function endKohTournament(
  tournamentId: string,
  organizerId: string,
  expectedVersion: number
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohVersion(row, expectedVersion);
  if (row.endedAt) {
    return getKohHub(tournamentId, organizerId);
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      endedAt: new Date(),
      version: { increment: 1 },
      updatedAt: new Date(),
      kohPendingPromote: Prisma.JsonNull
    }
  });

  logger.info("koh/endKohTournament", { tournamentId });
  return getKohHub(tournamentId, organizerId);
}

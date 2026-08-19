import { Prisma } from "@prisma/client";

import { logger } from "../../../../lib/logger.js";
import { prisma } from "../../../../lib/prisma.js";
import type { KohEndTournamentResult } from "../../application/ports.js";
import { getKohHub, requireKohTournament } from "./loadKohOps.js";
import { assertKohVersion } from "./kohVersion.js";

/**
 * Mark the KOH night finished — blocks further live mutations and voids whatever was
 * still on court, so an abandoned match never reaches rankings or the career board.
 */
export async function endKohTournament(
  tournamentId: string,
  organizerId: string,
  expectedVersion: number
): Promise<KohEndTournamentResult> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohVersion(row, expectedVersion);
  if (row.endedAt) {
    return { hub: await getKohHub(tournamentId, organizerId), voidedMatchCount: 0 };
  }

  const now = new Date();
  const voidedMatchCount = await prisma.$transaction(async (tx) => {
    const voided = await tx.kohMatch.updateMany({
      where: { court: { tournamentId }, completed: false, voidedAt: null },
      data: { voidedAt: now }
    });
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        endedAt: now,
        version: { increment: 1 },
        updatedAt: now,
        kohPendingPromote: Prisma.JsonNull
      }
    });
    return voided.count;
  });

  logger.info("koh/endKohTournament", { tournamentId, voidedMatchCount });
  return { hub: await getKohHub(tournamentId, organizerId), voidedMatchCount };
}

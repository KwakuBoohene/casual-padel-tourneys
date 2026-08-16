import type { PromoteKohPickInput } from "@padel/shared";
import { Prisma } from "@prisma/client";

import { applyOrganizerPromotionPick } from "../../../../engine/koh/index.js";
import { logger } from "../../../../lib/logger.js";
import { prisma } from "../../../../lib/prisma.js";
import { validation } from "../../../../shared/kernel/appError.js";
import type { KohTournamentHub } from "../../domain/types.js";
import { notifyToCourtChange, toEngineCourt } from "../mappers/kohEngineMapper.js";
import { parsePendingPromote } from "../mappers/kohHubMapper.js";
import { assertKohLive, getKohHub, requireKohTournament } from "./loadKohOps.js";
import { assertKohVersion } from "./kohVersion.js";
import { persistEngineCourts } from "./persistEngineCourts.js";

/** Resolve a pending promotion when multiple weakest candidates tied. */
export async function pickKohPromotion(
  tournamentId: string,
  organizerId: string,
  input: PromoteKohPickInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  assertKohVersion(row, input.expectedVersion);

  const pending = parsePendingPromote(row.kohPendingPromote);
  if (!pending) {
    throw validation("No pending promotion pick.");
  }
  if (!pending.candidateUnitIds.includes(input.demotedUnitId)) {
    throw validation("demotedUnitId is not a candidate for this promotion.");
  }
  if (row.kohCourts.length <= 1) {
    throw validation("Promotion requires multiple courts.");
  }

  const { courts: nextCourts, notify } = applyOrganizerPromotionPick({
    courts: row.kohCourts.map(toEngineCourt),
    fromCourtNumber: pending.fromCourtNumber,
    toCourtNumber: pending.toCourtNumber,
    promotedUnitId: pending.promotedUnitId,
    demotedUnitId: input.demotedUnitId
  });

  await prisma.$transaction(async (tx) => {
    await persistEngineCourts(tx, nextCourts);
    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        version: { increment: 1 },
        updatedAt: new Date(),
        kohPendingPromote: Prisma.JsonNull
      }
    });
  });

  logger.info("koh/pickKohPromotion", {
    tournamentId,
    promotedUnitId: notify.promotedUnitId,
    demotedUnitId: notify.demotedUnitId
  });

  const hub = await getKohHub(tournamentId, organizerId);
  return { ...hub, lastCourtChange: notifyToCourtChange(notify) };
}

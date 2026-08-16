import type { SwapKohUnitInput } from "@padel/shared";

import { logger } from "../../../../lib/logger.js";
import { prisma } from "../../../../lib/prisma.js";
import { validation } from "../../../../shared/kernel/appError.js";
import type { KohTournamentHub } from "../../domain/types.js";
import { assertKohLive, getKohHub, requireKohTournament } from "./loadKohOps.js";
import { assertKohVersion } from "./kohVersion.js";
import { persistQueueOrder } from "./persistEngineCourts.js";

/**
 * Swap king or challenger with another unit on the same court.
 * Blocks while a draft match is in progress.
 */
export async function swapKohCourtSlot(
  tournamentId: string,
  organizerId: string,
  courtId: string,
  input: SwapKohUnitInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  assertKohVersion(row, input.expectedVersion);

  const court = row.kohCourts.find((entry) => entry.id === courtId);
  if (!court) {
    throw validation("Court not found.");
  }
  if (court.matches.some((match) => !match.completed)) {
    throw validation("Cannot swap while a match is in progress.");
  }
  if (court.units.length < 2) {
    throw validation("Court needs king and challenger before swapping.");
  }

  const ordered = [...court.units].sort((a, b) => a.queuePosition - b.queuePosition);
  const slotIndex = input.slot === "KING" ? 0 : 1;
  const slotUnit = ordered[slotIndex];
  if (!slotUnit) {
    throw validation(`Court has no ${input.slot.toLowerCase()} to swap.`);
  }
  if (slotUnit.id === input.withUnitId) {
    throw validation("Cannot swap a unit with itself.");
  }
  const withIndex = ordered.findIndex((unit) => unit.id === input.withUnitId);
  if (withIndex < 0) {
    throw validation("Swap target unit is not on this court.");
  }

  const permanent = input.permanent ?? input.slot === "CHALLENGER";
  const next = ordered.map((unit) => unit.id);
  next[slotIndex] = input.withUnitId;
  next[withIndex] = slotUnit.id;

  await prisma.$transaction(async (tx) => {
    await persistQueueOrder(tx, next);
    await tx.kohCourt.update({
      where: { id: courtId },
      data: permanent
        ? {
            tempSwapSlot: null,
            tempSwapInUnitId: null,
            tempSwapOutUnitId: null,
            tempSwapReason: null
          }
        : {
            tempSwapSlot: input.slot,
            tempSwapInUnitId: input.withUnitId,
            tempSwapOutUnitId: slotUnit.id,
            tempSwapReason: input.reason
          }
    });
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  logger.info("koh/swapKohCourtSlot", {
    tournamentId,
    courtId,
    slot: input.slot,
    permanent,
    withUnitId: input.withUnitId
  });

  return getKohHub(tournamentId, organizerId);
}

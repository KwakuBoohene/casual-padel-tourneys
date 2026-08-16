import { prisma } from "../../../../lib/prisma.js";
import { validation } from "../../../../shared/kernel/appError.js";
import { shuffleQueueOnce, type KohEngineUnit } from "../../../../engine/koh/index.js";
import type { KohTournamentHub } from "../../domain/types.js";
import { assertKohLive, getKohHub, requireKohTournament } from "./loadKohOps.js";
import { persistQueueOrder } from "./persistEngineCourts.js";

export async function randomizeKohCourtQueue(
  tournamentId: string,
  organizerId: string,
  courtNumber: number
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  const court = row.kohCourts.find((entry) => entry.courtNumber === courtNumber);
  if (!court) {
    throw validation(`Court ${courtNumber} not found.`);
  }
  if (court.units.length < 2) {
    throw validation("Need at least 2 units on a court to randomize.");
  }

  const engineUnits: KohEngineUnit[] = court.units.map((unit) => ({
    id: unit.id,
    playerAId: unit.playerAId,
    playerBId: unit.playerBId,
    matchesWon: unit.matchesWon,
    matchesLost: unit.matchesLost,
    kingWinStreak: unit.kingWinStreak
  }));
  const shuffled = shuffleQueueOnce({
    id: court.id,
    courtNumber: court.courtNumber,
    queue: engineUnits
  });

  await prisma.$transaction(async (tx) => {
    await persistQueueOrder(
      tx,
      shuffled.queue.map((unit) => unit.id)
    );
    for (const unit of shuffled.queue) {
      await tx.kohUnit.update({
        where: { id: unit.id },
        data: { kingWinStreak: 0 }
      });
    }
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  return getKohHub(tournamentId, organizerId);
}

export async function reorderKohCourtQueue(
  tournamentId: string,
  organizerId: string,
  courtNumber: number,
  unitIds: string[]
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  const court = row.kohCourts.find((entry) => entry.courtNumber === courtNumber);
  if (!court) {
    throw validation(`Court ${courtNumber} not found.`);
  }
  if (unitIds.length < 2) {
    throw validation("Queue reorder requires at least 2 units.");
  }
  const existingIds = new Set(court.units.map((unit) => unit.id));
  if (unitIds.length !== existingIds.size || unitIds.some((id) => !existingIds.has(id))) {
    throw validation("unitIds must list each unit on the court exactly once.");
  }

  await prisma.$transaction(async (tx) => {
    await persistQueueOrder(tx, unitIds);
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  return getKohHub(tournamentId, organizerId);
}

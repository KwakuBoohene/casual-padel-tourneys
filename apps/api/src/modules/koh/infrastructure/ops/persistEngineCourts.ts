import type { Prisma } from "@prisma/client";

import type { KohEngineCourt } from "../../../../engine/koh/index.js";

/**
 * Write engine queues back to `kohUnit` rows in two phases so the unique
 * (courtId, queuePosition) index never sees a transient collision.
 */
export async function persistEngineCourts(
  tx: Prisma.TransactionClient,
  courts: KohEngineCourt[]
): Promise<void> {
  for (const court of courts) {
    for (let index = 0; index < court.queue.length; index += 1) {
      await tx.kohUnit.update({
        where: { id: court.queue[index].id },
        data: {
          courtId: court.id,
          queuePosition: 10_000 + court.courtNumber * 100 + index
        }
      });
    }
  }
  for (const court of courts) {
    for (let index = 0; index < court.queue.length; index += 1) {
      const unit = court.queue[index];
      await tx.kohUnit.update({
        where: { id: unit.id },
        data: {
          courtId: court.id,
          queuePosition: index,
          matchesWon: unit.matchesWon,
          matchesLost: unit.matchesLost,
          kingWinStreak: unit.kingWinStreak
        }
      });
    }
  }
}

/** Two-phase reposition for a single court queue given the desired unit order. */
export async function persistQueueOrder(
  tx: Prisma.TransactionClient,
  unitIds: string[]
): Promise<void> {
  for (let index = 0; index < unitIds.length; index += 1) {
    await tx.kohUnit.update({
      where: { id: unitIds[index] },
      data: { queuePosition: 1000 + index }
    });
  }
  for (let index = 0; index < unitIds.length; index += 1) {
    await tx.kohUnit.update({
      where: { id: unitIds[index] },
      data: { queuePosition: index }
    });
  }
}

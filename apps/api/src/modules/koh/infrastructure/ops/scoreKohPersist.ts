import type { SubmitKohScoreInput } from "@padel/shared";
import { Prisma } from "@prisma/client";

import { creditKohMatchToOrganizerPlayers } from "../../../organizerPlayers/infrastructure/careerCredits.js";
import { prisma } from "../../../../lib/prisma.js";
import type { KohEngineCourt } from "../../../../engine/koh/index.js";
import { kohSetRows, tallyKohSetStats } from "./kohSetStats.js";
import { persistEngineCourts, persistQueueOrder } from "./persistEngineCourts.js";

export type CompletedKohMatchWrite = {
  tournamentId: string;
  tournamentName: string;
  organizerId: string | null;
  /** Career board opt-in on the tournament row; false skips every career write. */
  contributeToCareerLeaderboard: boolean;
  courtId: string;
  matchId: string;
  unitAId: string;
  unitBId: string;
  winnerUnitId: string;
  winnerSide: "A" | "B";
  sets: SubmitKohScoreInput["sets"];
  /** Queues to write: all courts when a promotion moved units, otherwise just this court. */
  courtsToPersist: KohEngineCourt[] | null;
  scoredCourtQueue: KohEngineCourt;
  pendingPromote: Prisma.InputJsonValue | typeof Prisma.JsonNull | null;
};

export async function persistCompletedKohMatch(write: CompletedKohMatchWrite): Promise<void> {
  const setStats = tallyKohSetStats(write.sets);

  await prisma.$transaction(async (tx) => {
    await tx.kohMatchSet.deleteMany({ where: { matchId: write.matchId } });
    await tx.kohMatchSet.createMany({ data: kohSetRows(write.matchId, write.sets) });
    await tx.kohMatch.update({
      where: { id: write.matchId },
      data: {
        completed: true,
        winnerUnitId: write.winnerUnitId,
        updatedAt: new Date()
      }
    });

    if (write.courtsToPersist) {
      await persistEngineCourts(tx, write.courtsToPersist);
    } else {
      await persistQueueOrder(
        tx,
        write.scoredCourtQueue.queue.map((unit) => unit.id)
      );
      for (const unit of write.scoredCourtQueue.queue) {
        await tx.kohUnit.update({
          where: { id: unit.id },
          data: {
            matchesWon: unit.matchesWon,
            matchesLost: unit.matchesLost,
            kingWinStreak: unit.kingWinStreak
          }
        });
      }
    }

    await tx.kohUnit.update({
      where: { id: write.unitAId },
      data: {
        gamesWon: { increment: setStats.gamesA },
        gamesLost: { increment: setStats.gamesB },
        specialLosses: { increment: setStats.specialLossA }
      }
    });
    await tx.kohUnit.update({
      where: { id: write.unitBId },
      data: {
        gamesWon: { increment: setStats.gamesB },
        gamesLost: { increment: setStats.gamesA },
        specialLosses: { increment: setStats.specialLossB }
      }
    });

    if (write.organizerId && write.contributeToCareerLeaderboard) {
      const unitA = await tx.kohUnit.findUnique({
        where: { id: write.unitAId },
        select: { playerAId: true, playerBId: true }
      });
      const unitB = await tx.kohUnit.findUnique({
        where: { id: write.unitBId },
        select: { playerAId: true, playerBId: true }
      });
      if (unitA && unitB) {
        await creditKohMatchToOrganizerPlayers({
          tx,
          organizerId: write.organizerId,
          tournamentId: write.tournamentId,
          tournamentName: write.tournamentName,
          matchId: write.matchId,
          unitAPlayerIds: [unitA.playerAId, unitA.playerBId],
          unitBPlayerIds: [unitB.playerAId, unitB.playerBId],
          winnerSide: write.winnerSide,
          gamesA: setStats.gamesA,
          gamesB: setStats.gamesB
        });
      }
    }

    await tx.kohCourt.update({
      where: { id: write.courtId },
      data: {
        tempSwapSlot: null,
        tempSwapInUnitId: null,
        tempSwapOutUnitId: null,
        tempSwapReason: null
      }
    });

    await tx.tournament.update({
      where: { id: write.tournamentId },
      data: {
        version: { increment: 1 },
        updatedAt: new Date(),
        ...(write.pendingPromote !== null ? { kohPendingPromote: write.pendingPromote } : {})
      }
    });
  });
}

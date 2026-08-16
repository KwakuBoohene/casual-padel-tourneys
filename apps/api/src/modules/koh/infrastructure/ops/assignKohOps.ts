import type { AssignKohCourtsInput } from "@padel/shared";
import { createId, KOH_MAX_UNITS_PER_COURT } from "@padel/shared";
import { Prisma } from "@prisma/client";

import { logger } from "../../../../lib/logger.js";
import { ensureOrganizerPlayer } from "../../../../lib/organizerPlayers.js";
import { prisma } from "../../../../lib/prisma.js";
import { validation } from "../../../../shared/kernel/appError.js";
import type { KohTournamentHub } from "../../domain/types.js";
import { assertKohLive, getKohHub, requireKohTournament } from "./loadKohOps.js";

function collectPlayerNames(courts: AssignKohCourtsInput["courts"]): string[] {
  const names: string[] = [];
  for (const court of courts) {
    for (const unit of court.units) {
      names.push(unit.playerA.name.trim(), unit.playerB.name.trim());
    }
  }
  return names;
}

export async function assignKohCourts(
  tournamentId: string,
  organizerId: string,
  input: AssignKohCourtsInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);

  for (const court of input.courts) {
    if (court.courtNumber < 1 || court.courtNumber > row.courts) {
      throw validation(`courtNumber ${court.courtNumber} is outside 1..${row.courts}.`);
    }
    if (court.units.length > KOH_MAX_UNITS_PER_COURT) {
      throw validation(`Max ${KOH_MAX_UNITS_PER_COURT} units per court.`);
    }
  }

  const names = collectPlayerNames(input.courts);
  const uniqueLower = new Set(names.map((name) => name.toLowerCase()));
  if (uniqueLower.size !== names.length) {
    throw validation("Player names must be unique across the KOH tournament.");
  }

  const courtByNumber = new Map(row.kohCourts.map((court) => [court.courtNumber, court]));

  await prisma.$transaction(async (tx) => {
    await tx.kohUnit.deleteMany({
      where: { court: { tournamentId } }
    });
    await tx.player.deleteMany({ where: { tournamentId } });

    const playerIdByName = new Map<string, string>();
    for (const name of names) {
      const id = createId("player");
      playerIdByName.set(name.toLowerCase(), id);
      const organizerPlayerId = await ensureOrganizerPlayer(tx, organizerId, name);
      await tx.player.create({
        data: {
          id,
          tournamentId,
          name,
          gamesPlayed: 0,
          totalPoints: 0,
          organizerPlayerId
        }
      });
    }

    for (const assignment of input.courts) {
      const court = courtByNumber.get(assignment.courtNumber);
      if (!court) {
        throw validation(`Court ${assignment.courtNumber} not found.`);
      }
      await tx.kohCourt.update({
        where: { id: court.id },
        data: {
          tempSwapSlot: null,
          tempSwapInUnitId: null,
          tempSwapOutUnitId: null,
          tempSwapReason: null
        }
      });
      let position = 0;
      for (const unit of assignment.units) {
        const playerAId = playerIdByName.get(unit.playerA.name.trim().toLowerCase());
        const playerBId = playerIdByName.get(unit.playerB.name.trim().toLowerCase());
        if (!playerAId || !playerBId) {
          throw validation("Failed to resolve player ids for unit.");
        }
        await tx.kohUnit.create({
          data: {
            id: createId("kohunit"),
            courtId: court.id,
            playerAId,
            playerBId,
            queuePosition: position
          }
        });
        position += 1;
      }
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        version: { increment: 1 },
        updatedAt: new Date(),
        kohPendingPromote: Prisma.JsonNull
      }
    });
  });

  const hub = await getKohHub(tournamentId, organizerId);
  if (!hub.ready) {
    // Assignment may be partial while building the event; callers that need live play must check ready.
    logger.info("koh/assignKohCourts not ready", { tournamentId, ready: hub.ready });
  }
  return hub;
}

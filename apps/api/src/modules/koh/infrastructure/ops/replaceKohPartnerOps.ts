import type { ReplaceKohPartnerInput } from "@padel/shared";
import { createId } from "@padel/shared";

import { logger } from "../../../../lib/logger.js";
import { ensureOrganizerPlayer } from "../../../organizerPlayers/infrastructure/careerCredits.js";
import { prisma } from "../../../../lib/prisma.js";
import { validation } from "../../../../shared/kernel/appError.js";
import type { KohTournamentHub } from "../../domain/types.js";
import type { KohDbCourt } from "../mappers/kohInclude.js";
import { assertKohLive, getKohHub, requireKohTournament } from "./loadKohOps.js";
import { assertKohVersion } from "./kohVersion.js";

type KohDbUnit = KohDbCourt["units"][number];

function locateUnit(
  courts: KohDbCourt[],
  unitId: string
): { court: KohDbCourt; unit: KohDbUnit } {
  for (const court of courts) {
    const unit = court.units.find((entry) => entry.id === unitId);
    if (unit) {
      return { court, unit };
    }
  }
  throw validation("Unit not found.");
}

export async function replaceKohPartner(
  tournamentId: string,
  organizerId: string,
  unitId: string,
  input: ReplaceKohPartnerInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  assertKohVersion(row, input.expectedVersion);

  const { court: unitCourt, unit } = locateUnit(row.kohCourts, unitId);

  const open = unitCourt.matches.find((match) => !match.completed);
  if (open && (open.unitAId === unitId || open.unitBId === unitId)) {
    throw validation("Cannot replace a partner while a match is in progress.");
  }

  const leaveIsA = unit.playerAId === input.leavePlayerId;
  const leaveIsB = unit.playerBId === input.leavePlayerId;
  if (!leaveIsA && !leaveIsB) {
    throw validation("leavePlayerId is not on this unit.");
  }

  const replacementName = input.replacement.name.trim();
  if (!replacementName) {
    throw validation("Replacement name is required.");
  }

  const stayName = leaveIsA ? unit.playerB.name : unit.playerA.name;
  if (replacementName.toLowerCase() === stayName.trim().toLowerCase()) {
    throw validation("A KOH unit needs two different players.");
  }

  const duplicate = row.players.some(
    (player) => player.name.trim().toLowerCase() === replacementName.toLowerCase()
  );
  if (duplicate) {
    throw validation("Player names must be unique across the KOH tournament.");
  }

  const newPlayerId = createId("player");
  await prisma.$transaction(async (tx) => {
    const organizerPlayerId = await ensureOrganizerPlayer(tx, organizerId, replacementName);
    await tx.player.create({
      data: {
        id: newPlayerId,
        tournamentId,
        name: replacementName,
        gender: input.replacement.gender ?? null,
        gamesPlayed: 0,
        totalPoints: 0,
        organizerPlayerId
      }
    });
    await tx.kohUnit.update({
      where: { id: unitId },
      data: leaveIsA ? { playerAId: newPlayerId } : { playerBId: newPlayerId }
    });
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  logger.info("koh/replaceKohPartner", {
    tournamentId,
    unitId,
    leavePlayerId: input.leavePlayerId,
    newPlayerId
  });
  return getKohHub(tournamentId, organizerId);
}

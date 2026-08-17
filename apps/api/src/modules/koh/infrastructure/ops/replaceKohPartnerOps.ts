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

function locatePlayerUnit(
  courts: KohDbCourt[],
  playerId: string
): { court: KohDbCourt; unit: KohDbUnit; slotIsA: boolean } | null {
  for (const court of courts) {
    for (const unit of court.units) {
      if (unit.playerAId === playerId) return { court, unit, slotIsA: true };
      if (unit.playerBId === playerId) return { court, unit, slotIsA: false };
    }
  }
  return null;
}

function assertNoOpenMatch(court: KohDbCourt, unitId: string): void {
  const open = court.matches.find((match) => !match.completed);
  if (open && (open.unitAId === unitId || open.unitBId === unitId)) {
    throw validation("Cannot replace a partner while a match is in progress.");
  }
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
  assertNoOpenMatch(unitCourt, unitId);

  const leaveIsA = unit.playerAId === input.leavePlayerId;
  const leaveIsB = unit.playerBId === input.leavePlayerId;
  if (!leaveIsA && !leaveIsB) {
    throw validation("leavePlayerId is not on this unit.");
  }
  const stayPlayerId = leaveIsA ? unit.playerBId : unit.playerAId;
  const stayName = leaveIsA ? unit.playerB.name : unit.playerA.name;

  if (input.replacementPlayerId) {
    await swapExistingPartner({
      tournamentId,
      courts: row.kohCourts,
      unitId,
      leaveIsA,
      leavePlayerId: input.leavePlayerId,
      stayPlayerId,
      replacementPlayerId: input.replacementPlayerId
    });
  } else {
    await createReplacementPartner({
      tournamentId,
      organizerId,
      unitId,
      leaveIsA,
      stayName,
      players: row.players,
      replacement: input.replacement
    });
  }

  logger.info("koh/replaceKohPartner", {
    tournamentId,
    unitId,
    leavePlayerId: input.leavePlayerId,
    replacementPlayerId: input.replacementPlayerId ?? null
  });
  return getKohHub(tournamentId, organizerId);
}

async function swapExistingPartner(input: {
  tournamentId: string;
  courts: KohDbCourt[];
  unitId: string;
  leaveIsA: boolean;
  leavePlayerId: string;
  stayPlayerId: string;
  replacementPlayerId: string;
}): Promise<void> {
  if (input.replacementPlayerId === input.leavePlayerId) {
    throw validation("Cannot replace a player with themselves.");
  }
  if (input.replacementPlayerId === input.stayPlayerId) {
    throw validation("A King of the Court unit needs two different players.");
  }
  const donor = locatePlayerUnit(input.courts, input.replacementPlayerId);
  if (!donor) {
    throw validation("Replacement player is not on a King of the Court unit.");
  }
  if (donor.unit.id === input.unitId) {
    throw validation("A King of the Court unit needs two different players.");
  }
  assertNoOpenMatch(donor.court, donor.unit.id);

  await prisma.$transaction(async (tx) => {
    await tx.kohUnit.update({
      where: { id: input.unitId },
      data: input.leaveIsA
        ? { playerAId: input.replacementPlayerId }
        : { playerBId: input.replacementPlayerId }
    });
    await tx.kohUnit.update({
      where: { id: donor.unit.id },
      data: donor.slotIsA
        ? { playerAId: input.leavePlayerId }
        : { playerBId: input.leavePlayerId }
    });
    await tx.tournament.update({
      where: { id: input.tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });
}

async function createReplacementPartner(input: {
  tournamentId: string;
  organizerId: string;
  unitId: string;
  leaveIsA: boolean;
  stayName: string;
  players: { name: string }[];
  replacement: ReplaceKohPartnerInput["replacement"];
}): Promise<void> {
  const replacementName = input.replacement?.name.trim() ?? "";
  if (!replacementName) {
    throw validation("Replacement name is required.");
  }
  if (replacementName.toLowerCase() === input.stayName.trim().toLowerCase()) {
    throw validation("A King of the Court unit needs two different players.");
  }
  const duplicate = input.players.some(
    (player) => player.name.trim().toLowerCase() === replacementName.toLowerCase()
  );
  if (duplicate) {
    throw validation("Player names must be unique across the King of the Court tournament.");
  }

  const newPlayerId = createId("player");
  await prisma.$transaction(async (tx) => {
    const organizerPlayerId = await ensureOrganizerPlayer(
      tx,
      input.organizerId,
      replacementName
    );
    await tx.player.create({
      data: {
        id: newPlayerId,
        tournamentId: input.tournamentId,
        name: replacementName,
        gender: input.replacement?.gender ?? null,
        gamesPlayed: 0,
        totalPoints: 0,
        organizerPlayerId
      }
    });
    await tx.kohUnit.update({
      where: { id: input.unitId },
      data: input.leaveIsA ? { playerAId: newPlayerId } : { playerBId: newPlayerId }
    });
    await tx.tournament.update({
      where: { id: input.tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });
}

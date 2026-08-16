import type { RenameKohPlayerInput } from "@padel/shared";

import { logger } from "../../../../lib/logger.js";
import { prisma } from "../../../../lib/prisma.js";
import { validation } from "../../../../shared/kernel/appError.js";
import type { KohTournamentHub } from "../../domain/types.js";
import { assertKohLive, getKohHub, requireKohTournament } from "./loadKohOps.js";
import { assertKohVersion } from "./kohVersion.js";

export async function renameKohPlayer(
  tournamentId: string,
  organizerId: string,
  playerId: string,
  input: RenameKohPlayerInput
): Promise<KohTournamentHub> {
  const row = await requireKohTournament(tournamentId, organizerId);
  assertKohLive(row);
  assertKohVersion(row, input.expectedVersion);

  const player = row.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw validation("Player not found.");
  }

  const newName = input.newName.trim();
  if (!newName) {
    throw validation("Name is required.");
  }

  const taken = row.players.some(
    (entry) => entry.id !== playerId && entry.name.trim().toLowerCase() === newName.toLowerCase()
  );
  if (taken) {
    throw validation("Player names must be unique across the KOH tournament.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.player.update({
      where: { id: playerId },
      data: { name: newName }
    });
    if (player.organizerPlayerId) {
      const normalized = newName.trim().toLowerCase().replace(/\s+/g, " ");
      const conflictingPlayer = await tx.organizerPlayer.findFirst({
        where: {
          organizerId,
          nameNormalized: normalized,
          NOT: { id: player.organizerPlayerId }
        }
      });
      if (!conflictingPlayer) {
        await tx.organizerPlayer.update({
          where: { id: player.organizerPlayerId },
          data: { name: newName, nameNormalized: normalized, updatedAt: new Date() }
        });
      }
    }
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { version: { increment: 1 }, updatedAt: new Date() }
    });
  });

  logger.info("koh/renameKohPlayer", { tournamentId, playerId });
  return getKohHub(tournamentId, organizerId);
}

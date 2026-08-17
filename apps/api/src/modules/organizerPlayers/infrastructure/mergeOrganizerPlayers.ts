import { createId } from "@padel/shared";

import { prisma } from "../../../lib/prisma.js";
import { notFound, validation } from "../../../shared/kernel/appError.js";
import { archivedNameKey } from "../domain/archiveName.js";
import { canMergeCareers } from "../domain/mergeCareers.js";
import { normalizeOrganizerPlayerName } from "../domain/careerRange.js";

export async function mergeOrganizerPlayersInTx(input: {
  organizerId: string;
  playerIdA: string;
  playerIdB: string;
  survivingName: string;
}): Promise<{ id: string; name: string }> {
  if (input.playerIdA === input.playerIdB) {
    throw validation("Pick two different players.");
  }
  const survivingName = input.survivingName.trim();
  const nameNormalized = normalizeOrganizerPlayerName(survivingName);
  if (!nameNormalized) {
    throw validation("Enter a name for the combined player.");
  }

  return prisma.$transaction(async (tx) => {
    const [playerA, playerB] = await Promise.all([
      tx.organizerPlayer.findFirst({
        where: { id: input.playerIdA, organizerId: input.organizerId }
      }),
      tx.organizerPlayer.findFirst({
        where: { id: input.playerIdB, organizerId: input.organizerId }
      })
    ]);
    if (!playerA || !playerB) throw notFound("Player not found.");
    if (playerA.archivedAt || playerB.archivedAt) {
      throw validation("Archived players cannot be merged.");
    }

    const [deltasA, deltasB] = await Promise.all([
      tx.organizerPlayerStatDelta.findMany({
        where: { organizerPlayerId: playerA.id },
        select: { matchId: true }
      }),
      tx.organizerPlayerStatDelta.findMany({
        where: { organizerPlayerId: playerB.id },
        select: { matchId: true }
      })
    ]);
    if (!canMergeCareers(
      deltasA.map((row) => row.matchId),
      deltasB.map((row) => row.matchId)
    )) {
      throw validation(
        "These players both have a result from the same match, so they cannot be merged."
      );
    }

    const archivedAt = new Date();
    await tx.organizerPlayer.update({
      where: { id: playerA.id },
      data: { archivedAt, nameNormalized: archivedNameKey(playerA.id) }
    });
    await tx.organizerPlayer.update({
      where: { id: playerB.id },
      data: { archivedAt, nameNormalized: archivedNameKey(playerB.id) }
    });

    const clash = await tx.organizerPlayer.findUnique({
      where: {
        organizerId_nameNormalized: { organizerId: input.organizerId, nameNormalized }
      }
    });
    if (clash) {
      throw validation("That name is already used by another active player.");
    }

    const id = createId("orgplayer");
    await tx.organizerPlayer.create({
      data: { id, organizerId: input.organizerId, name: survivingName, nameNormalized }
    });
    await tx.organizerPlayerStatDelta.updateMany({
      where: { organizerPlayerId: { in: [playerA.id, playerB.id] } },
      data: { organizerPlayerId: id }
    });
    await tx.player.updateMany({
      where: { organizerPlayerId: { in: [playerA.id, playerB.id] } },
      data: { organizerPlayerId: id }
    });
    return { id, name: survivingName };
  });
}

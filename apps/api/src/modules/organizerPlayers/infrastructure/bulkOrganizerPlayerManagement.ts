import { prisma } from "../../../lib/prisma.js";
import { notFound } from "../../../shared/kernel/appError.js";
import { archivedNameKey, nextUnarchiveDisplayName } from "../domain/archiveName.js";
import { normalizeOrganizerPlayerName } from "../domain/careerRange.js";

function uniqueIds(playerIds: string[]): string[] {
  return [...new Set(playerIds)];
}

export async function archiveOrganizerPlayerRows(
  organizerId: string,
  playerIds: string[]
): Promise<{ count: number }> {
  const ids = uniqueIds(playerIds);
  const players = await prisma.organizerPlayer.findMany({
    where: { organizerId, id: { in: ids } },
    select: { id: true, archivedAt: true }
  });
  if (players.length !== ids.length) throw notFound("Player not found.");
  const toArchive = players.filter((player) => !player.archivedAt);
  if (toArchive.length === 0) return { count: 0 };
  const archivedAt = new Date();
  await prisma.$transaction(
    toArchive.map((player) =>
      prisma.organizerPlayer.update({
        where: { id: player.id },
        data: { archivedAt, nameNormalized: archivedNameKey(player.id) }
      })
    )
  );
  return { count: toArchive.length };
}

export async function unarchiveOrganizerPlayerRows(
  organizerId: string,
  playerIds: string[]
): Promise<{ count: number }> {
  const ids = uniqueIds(playerIds);
  return prisma.$transaction(async (tx) => {
    const players = await tx.organizerPlayer.findMany({
      where: { organizerId, id: { in: ids } },
      select: { id: true, name: true, archivedAt: true }
    });
    if (players.length !== ids.length) throw notFound("Player not found.");
    const taken = new Set(
      (
        await tx.organizerPlayer.findMany({
          where: { organizerId, archivedAt: null },
          select: { nameNormalized: true }
        })
      ).map((row) => row.nameNormalized)
    );
    const byId = new Map(players.map((player) => [player.id, player]));
    let count = 0;
    for (const id of ids) {
      const player = byId.get(id);
      if (!player?.archivedAt) continue;
      const name = nextUnarchiveDisplayName(player.name, taken);
      const nameNormalized = normalizeOrganizerPlayerName(name);
      taken.add(nameNormalized);
      await tx.organizerPlayer.update({
        where: { id: player.id },
        data: { archivedAt: null, name, nameNormalized }
      });
      count += 1;
    }
    return { count };
  });
}

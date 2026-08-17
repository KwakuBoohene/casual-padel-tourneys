import { prisma } from "../../../lib/prisma.js";
import { notFound, validation } from "../../../shared/kernel/appError.js";
import { archivedNameKey, nextUnarchiveDisplayName } from "../domain/archiveName.js";
import { normalizeOrganizerPlayerName } from "../domain/careerRange.js";
import type { OrganizerManagedPlayerRow } from "../application/ports.js";
import { mergeOrganizerPlayersInTx } from "./mergeOrganizerPlayers.js";

export async function listManagedOrganizerPlayers(
  organizerId: string,
  status: "active" | "archived"
): Promise<OrganizerManagedPlayerRow[]> {
  const archived = status === "archived";
  const players = await prisma.organizerPlayer.findMany({
    where: { organizerId, archivedAt: archived ? { not: null } : null },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
  const totals =
    players.length === 0
      ? []
      : await prisma.organizerPlayerStatDelta.groupBy({
          by: ["organizerPlayerId"],
          where: { organizerId, organizerPlayerId: { in: players.map((row) => row.id) } },
          _sum: { matchesWon: true, matchesLost: true, matchesDrawn: true }
        });
  const byId = new Map(totals.map((row) => [row.organizerPlayerId, row._sum]));
  const taken = archived
    ? new Set(
        (
          await prisma.organizerPlayer.findMany({
            where: { organizerId, archivedAt: null },
            select: { nameNormalized: true }
          })
        ).map((row) => row.nameNormalized)
      )
    : null;

  return players.map((player) => {
    const sum = byId.get(player.id);
    return {
      id: player.id,
      name: player.name,
      matchesWon: sum?.matchesWon ?? 0,
      matchesLost: sum?.matchesLost ?? 0,
      matchesDrawn: sum?.matchesDrawn ?? 0,
      ...(archived && taken
        ? { suggestedRestoreName: nextUnarchiveDisplayName(player.name, taken) }
        : {})
    };
  });
}

export async function archiveOrganizerPlayerRow(
  organizerId: string,
  organizerPlayerId: string
): Promise<{ id: string; name: string }> {
  const player = await prisma.organizerPlayer.findFirst({
    where: { id: organizerPlayerId, organizerId },
    select: { id: true, name: true, archivedAt: true }
  });
  if (!player) throw notFound("Player not found.");
  if (player.archivedAt) return { id: player.id, name: player.name };
  await prisma.organizerPlayer.update({
    where: { id: player.id },
    data: { archivedAt: new Date(), nameNormalized: archivedNameKey(player.id) }
  });
  return { id: player.id, name: player.name };
}

export async function unarchiveOrganizerPlayerRow(
  organizerId: string,
  organizerPlayerId: string
): Promise<{ id: string; name: string }> {
  const player = await prisma.organizerPlayer.findFirst({
    where: { id: organizerPlayerId, organizerId },
    select: { id: true, name: true, archivedAt: true }
  });
  if (!player) throw notFound("Player not found.");
  if (!player.archivedAt) throw validation("Player is not archived.");
  const active = await prisma.organizerPlayer.findMany({
    where: { organizerId, archivedAt: null },
    select: { nameNormalized: true }
  });
  const name = nextUnarchiveDisplayName(
    player.name,
    new Set(active.map((row) => row.nameNormalized))
  );
  await prisma.organizerPlayer.update({
    where: { id: player.id },
    data: {
      archivedAt: null,
      name,
      nameNormalized: normalizeOrganizerPlayerName(name)
    }
  });
  return { id: player.id, name };
}

export async function mergeOrganizerPlayerRows(input: {
  organizerId: string;
  playerIdA: string;
  playerIdB: string;
  survivingName: string;
}): Promise<{ id: string; name: string }> {
  return mergeOrganizerPlayersInTx(input);
}

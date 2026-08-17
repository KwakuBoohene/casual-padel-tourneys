import { mergePlayerSuggestionNames } from "@padel/shared";

import { prisma } from "../../../lib/prisma.js";
import { normalizeOrganizerPlayerName } from "../../organizerPlayers/domain/careerRange.js";

export async function listPlayerSuggestionNames(organizerId: string): Promise<string[]> {
  const [eventRows, careerRows, archivedRows] = await Promise.all([
    prisma.player.findMany({
      where: { tournament: { organizerId } },
      select: { name: true },
      distinct: ["name"]
    }),
    prisma.organizerPlayer.findMany({
      where: { organizerId, archivedAt: null },
      select: { name: true }
    }),
    prisma.organizerPlayer.findMany({
      where: { organizerId, archivedAt: { not: null } },
      select: { name: true }
    })
  ]);
  const archivedKeys = new Set(
    archivedRows.map((row) => normalizeOrganizerPlayerName(row.name))
  );
  return mergePlayerSuggestionNames(
    eventRows.map((row) => row.name).filter((name) => !archivedKeys.has(normalizeOrganizerPlayerName(name))),
    careerRows.map((row) => row.name)
  );
}

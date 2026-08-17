import { mergePlayerSuggestionNames } from "@padel/shared";

import { prisma } from "../../../lib/prisma.js";

export async function listPlayerSuggestionNames(organizerId: string): Promise<string[]> {
  const [eventRows, careerRows] = await Promise.all([
    prisma.player.findMany({
      where: { tournament: { organizerId } },
      select: { name: true },
      distinct: ["name"]
    }),
    prisma.organizerPlayer.findMany({
      where: { organizerId },
      select: { name: true }
    })
  ]);
  return mergePlayerSuggestionNames(
    eventRows.map((row) => row.name),
    careerRows.map((row) => row.name)
  );
}

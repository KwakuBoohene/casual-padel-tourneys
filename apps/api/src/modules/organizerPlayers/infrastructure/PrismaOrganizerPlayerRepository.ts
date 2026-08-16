import type { OrganizerPlayerLeaderboardMode } from "@padel/shared";

import { prisma } from "../../../lib/prisma.js";
import type { CareerDeltaQuery, OrganizerPlayerRepository } from "../application/ports.js";
import type { CareerDelta } from "../domain/careerStats.js";

export class PrismaOrganizerPlayerRepository implements OrganizerPlayerRepository {
  async listDeltas(query: CareerDeltaQuery): Promise<CareerDelta[]> {
    let tournamentIds: string[] | undefined;
    if (query.mode && query.mode !== "overall") {
      const tournaments = await prisma.tournament.findMany({
        where: { organizerId: query.organizerId, mode: query.mode },
        select: { id: true }
      });
      tournamentIds = tournaments.map((row) => row.id);
      if (tournamentIds.length === 0) {
        return [];
      }
    }

    const rows = await prisma.organizerPlayerStatDelta.findMany({
      where: {
        organizerId: query.organizerId,
        ...(query.organizerPlayerId ? { organizerPlayerId: query.organizerPlayerId } : {}),
        ...(query.since ? { occurredAt: { gte: query.since } } : {}),
        ...(tournamentIds ? { tournamentId: { in: tournamentIds } } : {}),
        ...(query.q?.trim()
          ? {
              organizerPlayer: {
                name: { contains: query.q.trim(), mode: "insensitive" }
              }
            }
          : {})
      },
      orderBy: { occurredAt: "desc" },
      select: {
        organizerPlayerId: true,
        tournamentId: true,
        tournamentName: true,
        gamesWon: true,
        gamesLost: true,
        matchesWon: true,
        matchesLost: true,
        organizerPlayer: { select: { name: true } }
      }
    });

    return rows.map((row) => ({
      organizerPlayerId: row.organizerPlayerId,
      organizerPlayerName: row.organizerPlayer.name,
      tournamentId: row.tournamentId,
      tournamentName: row.tournamentName,
      gamesWon: row.gamesWon,
      gamesLost: row.gamesLost,
      matchesWon: row.matchesWon,
      matchesLost: row.matchesLost
    }));
  }

  async findPlayer(
    organizerId: string,
    organizerPlayerId: string
  ): Promise<{ id: string; name: string } | null> {
    const player = await prisma.organizerPlayer.findFirst({
      where: { id: organizerPlayerId, organizerId },
      select: { id: true, name: true }
    });
    return player ?? null;
  }
}

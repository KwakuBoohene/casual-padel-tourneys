import { prisma } from "../../../lib/prisma.js";
import type { CareerDeltaQuery, OrganizerPlayerRepository } from "../application/ports.js";
import type { CareerDelta } from "../domain/careerStats.js";

export class PrismaOrganizerPlayerRepository implements OrganizerPlayerRepository {
  async listDeltas(query: CareerDeltaQuery): Promise<CareerDelta[]> {
    const rows = await prisma.organizerPlayerStatDelta.findMany({
      where: {
        organizerId: query.organizerId,
        ...(query.organizerPlayerId ? { organizerPlayerId: query.organizerPlayerId } : {}),
        ...(query.tournamentMode ? { tournamentMode: query.tournamentMode } : {}),
        ...(query.since ? { occurredAt: { gte: query.since } } : {})
      },
      orderBy: { occurredAt: "desc" },
      select: {
        organizerPlayerId: true,
        tournamentId: true,
        tournamentName: true,
        tournamentMode: true,
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
      tournamentMode: row.tournamentMode,
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

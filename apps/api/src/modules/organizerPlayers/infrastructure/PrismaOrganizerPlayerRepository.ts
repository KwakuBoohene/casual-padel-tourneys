import { prisma } from "../../../lib/prisma.js";
import type {
  CareerDeltaQuery,
  CareerMatchQuery,
  CareerMatchRow,
  OrganizerManagedPlayerRow,
  OrganizerPlayerRepository
} from "../application/ports.js";
import type { CareerDelta } from "../domain/careerStats.js";
import {
  archiveOrganizerPlayerRows,
  unarchiveOrganizerPlayerRows
} from "./bulkOrganizerPlayerManagement.js";
import {
  archiveOrganizerPlayerRow,
  listManagedOrganizerPlayers,
  mergeOrganizerPlayerRows,
  renameOrganizerPlayerRow,
  unarchiveOrganizerPlayerRow
} from "./organizerPlayerManagement.js";

export class PrismaOrganizerPlayerRepository implements OrganizerPlayerRepository {
  async findShareToken(organizerId: string): Promise<string | null> {
    const row = await prisma.user.findUnique({
      where: { id: organizerId },
      select: { careerShareToken: true }
    });
    return row?.careerShareToken ?? null;
  }

  async setShareToken(organizerId: string, token: string | null): Promise<string | null> {
    const row = await prisma.user.update({
      where: { id: organizerId },
      data: { careerShareToken: token },
      select: { careerShareToken: true }
    });
    return row.careerShareToken;
  }

  async findOrganizerByShareToken(token: string): Promise<{ id: string; name: string } | null> {
    if (!token) return null;
    const row = await prisma.user.findUnique({
      where: { careerShareToken: token },
      select: { id: true, name: true, isGuest: true }
    });
    // A guest has no career board, so their link resolves to nothing.
    if (!row || row.isGuest) return null;
    return { id: row.id, name: row.name };
  }

  async listMatchesForExport(query: CareerMatchQuery): Promise<CareerMatchRow[]> {
    const rows = await prisma.organizerPlayerStatDelta.findMany({
      where: {
        organizerId: query.organizerId,
        ...(query.since ? { occurredAt: { gte: query.since } } : {})
      },
      orderBy: { occurredAt: "desc" },
      take: query.limit,
      select: {
        occurredAt: true,
        tournamentId: true,
        matchId: true,
        tournamentName: true,
        tournamentMode: true,
        matchesWon: true,
        matchesLost: true,
        matchesDrawn: true,
        gamesWon: true,
        gamesLost: true,
        americanoPointsWon: true,
        americanoPointsLost: true,
        organizerPlayer: { select: { name: true } }
      }
    });

    return rows.map((row) => ({
      occurredAt: row.occurredAt,
      tournamentId: row.tournamentId,
      matchId: row.matchId,
      tournamentName: row.tournamentName,
      tournamentMode: String(row.tournamentMode),
      playerName: row.organizerPlayer.name,
      matchesWon: row.matchesWon,
      matchesLost: row.matchesLost,
      matchesDrawn: row.matchesDrawn,
      gamesWon: row.gamesWon,
      gamesLost: row.gamesLost,
      americanoPointsWon: row.americanoPointsWon,
      americanoPointsLost: row.americanoPointsLost
    }));
  }

  async listDeltas(query: CareerDeltaQuery): Promise<CareerDelta[]> {
    const rows = await prisma.organizerPlayerStatDelta.findMany({
      where: {
        organizerId: query.organizerId,
        ...(query.organizerPlayerId
          ? { organizerPlayerId: query.organizerPlayerId }
          : query.activeOnly === false
            ? {}
            : { organizerPlayer: { archivedAt: null } }),
        ...(query.since ? { occurredAt: { gte: query.since } } : {})
      },
      orderBy: { occurredAt: "desc" },
      select: {
        organizerPlayerId: true,
        tournamentId: true,
        tournamentName: true,
        gamesWon: true,
        gamesLost: true,
        setsWon: true,
        setsLost: true,
        matchesWon: true,
        matchesLost: true,
        matchesDrawn: true,
        americanoPointsWon: true,
        americanoPointsLost: true,
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
      setsWon: row.setsWon,
      setsLost: row.setsLost,
      matchesWon: row.matchesWon,
      matchesLost: row.matchesLost,
      matchesDrawn: row.matchesDrawn,
      americanoPointsWon: row.americanoPointsWon,
      americanoPointsLost: row.americanoPointsLost
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

  listManaged(
    organizerId: string,
    status: "active" | "archived"
  ): Promise<OrganizerManagedPlayerRow[]> {
    return listManagedOrganizerPlayers(organizerId, status);
  }

  archivePlayer(organizerId: string, organizerPlayerId: string): Promise<{ id: string; name: string }> {
    return archiveOrganizerPlayerRow(organizerId, organizerPlayerId);
  }

  archivePlayers(organizerId: string, playerIds: string[]): Promise<{ count: number }> {
    return archiveOrganizerPlayerRows(organizerId, playerIds);
  }

  unarchivePlayer(
    organizerId: string,
    organizerPlayerId: string
  ): Promise<{ id: string; name: string }> {
    return unarchiveOrganizerPlayerRow(organizerId, organizerPlayerId);
  }

  unarchivePlayers(organizerId: string, playerIds: string[]): Promise<{ count: number }> {
    return unarchiveOrganizerPlayerRows(organizerId, playerIds);
  }

  mergePlayers(input: {
    organizerId: string;
    playerIdA: string;
    playerIdB: string;
    survivingName: string;
  }): Promise<{ id: string; name: string }> {
    return mergeOrganizerPlayerRows(input);
  }

  renamePlayer(
    organizerId: string,
    organizerPlayerId: string,
    name: string
  ): Promise<{ id: string; name: string }> {
    return renameOrganizerPlayerRow(organizerId, organizerPlayerId, name);
  }
}

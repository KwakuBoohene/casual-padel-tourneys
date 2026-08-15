import type {
  OrganizerPlayerDetail,
  OrganizerPlayerLeaderboard,
  OrganizerPlayerRange
} from "@padel/shared";
import { createId } from "@padel/shared";
import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma.js";

export function normalizeOrganizerPlayerName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function rangeStart(range: OrganizerPlayerRange, now = new Date()): Date | null {
  if (range === "all") return null;
  if (range === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

/** Upsert career identity and return its id. */
export async function ensureOrganizerPlayer(
  tx: Prisma.TransactionClient,
  organizerId: string,
  displayName: string
): Promise<string> {
  const name = displayName.trim();
  const nameNormalized = normalizeOrganizerPlayerName(name);
  const existing = await tx.organizerPlayer.findUnique({
    where: {
      organizerId_nameNormalized: { organizerId, nameNormalized }
    }
  });
  if (existing) {
    if (existing.name !== name) {
      await tx.organizerPlayer.update({
        where: { id: existing.id },
        data: { name, updatedAt: new Date() }
      });
    }
    return existing.id;
  }
  const id = createId("orgplayer");
  await tx.organizerPlayer.create({
    data: { id, organizerId, name, nameNormalized }
  });
  return id;
}

export async function creditKohMatchToOrganizerPlayers(input: {
  tx: Prisma.TransactionClient;
  organizerId: string;
  tournamentId: string;
  tournamentName: string;
  matchId: string;
  unitAPlayerIds: [string, string];
  unitBPlayerIds: [string, string];
  winnerSide: "A" | "B";
  gamesA: number;
  gamesB: number;
  occurredAt?: Date;
}): Promise<void> {
  const players = await input.tx.player.findMany({
    where: {
      id: {
        in: [...input.unitAPlayerIds, ...input.unitBPlayerIds]
      }
    },
    select: { id: true, organizerPlayerId: true, name: true }
  });
  const byId = new Map(players.map((player) => [player.id, player]));

  async function resolveCareerId(playerId: string): Promise<string | null> {
    const row = byId.get(playerId);
    if (!row) return null;
    if (row.organizerPlayerId) return row.organizerPlayerId;
    const careerId = await ensureOrganizerPlayer(input.tx, input.organizerId, row.name);
    await input.tx.player.update({
      where: { id: playerId },
      data: { organizerPlayerId: careerId }
    });
    return careerId;
  }

  const sides: Array<{
    playerIds: [string, string];
    gamesWon: number;
    gamesLost: number;
    matchesWon: number;
    matchesLost: number;
  }> = [
    {
      playerIds: input.unitAPlayerIds,
      gamesWon: input.gamesA,
      gamesLost: input.gamesB,
      matchesWon: input.winnerSide === "A" ? 1 : 0,
      matchesLost: input.winnerSide === "A" ? 0 : 1
    },
    {
      playerIds: input.unitBPlayerIds,
      gamesWon: input.gamesB,
      gamesLost: input.gamesA,
      matchesWon: input.winnerSide === "B" ? 1 : 0,
      matchesLost: input.winnerSide === "B" ? 0 : 1
    }
  ];

  const occurredAt = input.occurredAt ?? new Date();
  for (const side of sides) {
    for (const playerId of side.playerIds) {
      const careerId = await resolveCareerId(playerId);
      if (!careerId) continue;
      await input.tx.organizerPlayerStatDelta.upsert({
        where: {
          matchId_organizerPlayerId: {
            matchId: input.matchId,
            organizerPlayerId: careerId
          }
        },
        create: {
          id: createId("orgpdelta"),
          organizerId: input.organizerId,
          organizerPlayerId: careerId,
          tournamentId: input.tournamentId,
          tournamentName: input.tournamentName,
          matchId: input.matchId,
          gamesWon: side.gamesWon,
          gamesLost: side.gamesLost,
          matchesWon: side.matchesWon,
          matchesLost: side.matchesLost,
          occurredAt
        },
        update: {
          gamesWon: side.gamesWon,
          gamesLost: side.gamesLost,
          matchesWon: side.matchesWon,
          matchesLost: side.matchesLost,
          tournamentName: input.tournamentName,
          occurredAt
        }
      });
    }
  }
}

export async function getOrganizerPlayerLeaderboard(
  organizerId: string,
  range: OrganizerPlayerRange
): Promise<OrganizerPlayerLeaderboard> {
  const start = rangeStart(range);
  const deltas = await prisma.organizerPlayerStatDelta.findMany({
    where: {
      organizerId,
      ...(start ? { occurredAt: { gte: start } } : {})
    },
    select: {
      organizerPlayerId: true,
      tournamentId: true,
      gamesWon: true,
      matchesWon: true,
      gamesLost: true,
      matchesLost: true,
      organizerPlayer: { select: { id: true, name: true } }
    }
  });

  const byPlayer = new Map<
    string,
    {
      id: string;
      name: string;
      gamesWon: number;
      matchesWon: number;
      gamesLost: number;
      matchesLost: number;
      events: Set<string>;
    }
  >();

  for (const delta of deltas) {
    const current = byPlayer.get(delta.organizerPlayerId) ?? {
      id: delta.organizerPlayer.id,
      name: delta.organizerPlayer.name,
      gamesWon: 0,
      matchesWon: 0,
      gamesLost: 0,
      matchesLost: 0,
      events: new Set<string>()
    };
    current.gamesWon += delta.gamesWon;
    current.matchesWon += delta.matchesWon;
    current.gamesLost += delta.gamesLost;
    current.matchesLost += delta.matchesLost;
    current.events.add(delta.tournamentId);
    byPlayer.set(delta.organizerPlayerId, current);
  }

  const rows = [...byPlayer.values()]
    .sort((a, b) => {
      if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
      if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
      return a.name.localeCompare(b.name);
    })
    .map((row, index) => ({
      rank: index + 1,
      id: row.id,
      name: row.name,
      gamesWon: row.gamesWon,
      matchesWon: row.matchesWon,
      gamesLost: row.gamesLost,
      matchesLost: row.matchesLost,
      eventsPlayed: row.events.size
    }));

  return { range, rows };
}

export async function getOrganizerPlayerDetail(
  organizerId: string,
  organizerPlayerId: string,
  range: OrganizerPlayerRange
): Promise<OrganizerPlayerDetail | null> {
  const player = await prisma.organizerPlayer.findFirst({
    where: { id: organizerPlayerId, organizerId }
  });
  if (!player) return null;

  const start = rangeStart(range);
  const deltas = await prisma.organizerPlayerStatDelta.findMany({
    where: {
      organizerPlayerId,
      organizerId,
      ...(start ? { occurredAt: { gte: start } } : {})
    },
    orderBy: { occurredAt: "desc" }
  });

  let gamesWon = 0;
  let matchesWon = 0;
  let gamesLost = 0;
  let matchesLost = 0;
  const byEvent = new Map<
    string,
    { tournamentId: string; tournamentName: string; gamesWon: number; matchesWon: number }
  >();

  for (const delta of deltas) {
    gamesWon += delta.gamesWon;
    matchesWon += delta.matchesWon;
    gamesLost += delta.gamesLost;
    matchesLost += delta.matchesLost;
    const event = byEvent.get(delta.tournamentId) ?? {
      tournamentId: delta.tournamentId,
      tournamentName: delta.tournamentName,
      gamesWon: 0,
      matchesWon: 0
    };
    event.gamesWon += delta.gamesWon;
    event.matchesWon += delta.matchesWon;
    byEvent.set(delta.tournamentId, event);
  }

  return {
    id: player.id,
    name: player.name,
    range,
    gamesWon,
    matchesWon,
    gamesLost,
    matchesLost,
    eventsPlayed: byEvent.size,
    recentEvents: [...byEvent.values()].slice(0, 12)
  };
}

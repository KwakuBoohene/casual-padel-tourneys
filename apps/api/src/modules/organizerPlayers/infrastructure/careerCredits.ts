import { createId, type TournamentMode } from "@padel/shared";
import type { Prisma } from "@prisma/client";

import { normalizeOrganizerPlayerName } from "../domain/careerRange.js";

/**
 * Write side of career tracking. These run inside the caller's transaction (KOH scoring,
 * assignment and partner swaps, Americano/Mexicano score submits), so they take a
 * `TransactionClient` rather than owning one. This is the module's stable entry point for other
 * bounded contexts.
 */

/** Upsert a career identity for the organizer and return its id. */
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

export interface MatchCredit {
  tx: Prisma.TransactionClient;
  organizerId: string;
  tournamentId: string;
  tournamentName: string;
  /** Stored on every delta so the board can be filtered per mode. */
  tournamentMode: TournamentMode;
  matchId: string;
  /** Every named player on the side — doubles credits all four across both sides. */
  sideAPlayerIds: string[];
  sideBPlayerIds: string[];
  /** `null` for a drawn Americano match: games count, match wins do not. */
  winnerSide: "A" | "B" | null;
  gamesA: number;
  gamesB: number;
  occurredAt?: Date;
}

export interface KohMatchCredit {
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
}

interface CreditSide {
  playerIds: string[];
  gamesWon: number;
  gamesLost: number;
  matchesWon: number;
  matchesLost: number;
}

function creditSides(input: MatchCredit): CreditSide[] {
  return [
    {
      playerIds: input.sideAPlayerIds,
      gamesWon: input.gamesA,
      gamesLost: input.gamesB,
      matchesWon: input.winnerSide === "A" ? 1 : 0,
      matchesLost: input.winnerSide === "B" ? 1 : 0
    },
    {
      playerIds: input.sideBPlayerIds,
      gamesWon: input.gamesB,
      gamesLost: input.gamesA,
      matchesWon: input.winnerSide === "B" ? 1 : 0,
      matchesLost: input.winnerSide === "A" ? 1 : 0
    }
  ];
}

/**
 * Credit one completed match to every named player's career.
 * Idempotent per (match, career player): re-submitting a score overwrites the delta.
 */
export async function creditMatchToOrganizerPlayers(input: MatchCredit): Promise<void> {
  const playerIds = [...input.sideAPlayerIds, ...input.sideBPlayerIds];
  const players = await input.tx.player.findMany({
    where: { id: { in: playerIds } },
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

  const occurredAt = input.occurredAt ?? new Date();
  for (const side of creditSides(input)) {
    for (const playerId of side.playerIds) {
      const careerId = await resolveCareerId(playerId);
      if (!careerId) continue;
      await input.tx.organizerPlayerStatDelta.upsert({
        where: {
          matchId_organizerPlayerId: { matchId: input.matchId, organizerPlayerId: careerId }
        },
        create: {
          id: createId("orgpdelta"),
          organizerId: input.organizerId,
          organizerPlayerId: careerId,
          tournamentId: input.tournamentId,
          tournamentName: input.tournamentName,
          tournamentMode: input.tournamentMode,
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
          tournamentMode: input.tournamentMode,
          tournamentName: input.tournamentName,
          occurredAt
        }
      });
    }
  }
}

/** KOH units are always doubles pairs; the ladder never produces a draw. */
export async function creditKohMatchToOrganizerPlayers(input: KohMatchCredit): Promise<void> {
  await creditMatchToOrganizerPlayers({
    tx: input.tx,
    organizerId: input.organizerId,
    tournamentId: input.tournamentId,
    tournamentName: input.tournamentName,
    tournamentMode: "KING_OF_THE_HILL",
    matchId: input.matchId,
    sideAPlayerIds: [...input.unitAPlayerIds],
    sideBPlayerIds: [...input.unitBPlayerIds],
    winnerSide: input.winnerSide,
    gamesA: input.gamesA,
    gamesB: input.gamesB,
    occurredAt: input.occurredAt
  });
}

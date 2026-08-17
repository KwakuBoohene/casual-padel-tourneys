import { createId, KING_OF_THE_COURT } from "@padel/shared";
import type { Prisma, TournamentMode } from "@prisma/client";

import { normalizeOrganizerPlayerName } from "../domain/careerRange.js";

/** Write side of career tracking. Runs inside the caller's Prisma transaction. */

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
  setsA: number;
  setsB: number;
  occurredAt?: Date;
  /** Defaults to King of the Court (KOH credit path). */
  tournamentMode?: TournamentMode;
  /** When false, skip writing deltas. Default true. */
  contributeToCareerLeaderboard?: boolean;
}

interface CreditSide {
  playerIds: [string, string];
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
  matchesWon: number;
  matchesLost: number;
}

/** Idempotent per (match, career player): re-submitting a score overwrites the delta. */
export async function creditKohMatchToOrganizerPlayers(input: KohMatchCredit): Promise<void> {
  if (input.contributeToCareerLeaderboard === false) return;
  const players = await input.tx.player.findMany({
    where: { id: { in: [...input.unitAPlayerIds, ...input.unitBPlayerIds] } },
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

  const sides: CreditSide[] = [
    {
      playerIds: input.unitAPlayerIds,
      gamesWon: input.gamesA,
      gamesLost: input.gamesB,
      setsWon: input.setsA,
      setsLost: input.setsB,
      matchesWon: input.winnerSide === "A" ? 1 : 0,
      matchesLost: input.winnerSide === "A" ? 0 : 1
    },
    {
      playerIds: input.unitBPlayerIds,
      gamesWon: input.gamesB,
      gamesLost: input.gamesA,
      setsWon: input.setsB,
      setsLost: input.setsA,
      matchesWon: input.winnerSide === "B" ? 1 : 0,
      matchesLost: input.winnerSide === "B" ? 0 : 1
    }
  ];

  const occurredAt = input.occurredAt ?? new Date();
  const tournamentMode = input.tournamentMode ?? KING_OF_THE_COURT;
  for (const side of sides) {
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
          tournamentMode,
          matchId: input.matchId,
          gamesWon: side.gamesWon,
          gamesLost: side.gamesLost,
          setsWon: side.setsWon,
          setsLost: side.setsLost,
          matchesWon: side.matchesWon,
          matchesLost: side.matchesLost,
          occurredAt
        },
        update: {
          gamesWon: side.gamesWon,
          gamesLost: side.gamesLost,
          setsWon: side.setsWon,
          setsLost: side.setsLost,
          matchesWon: side.matchesWon,
          matchesLost: side.matchesLost,
          tournamentMode,
          tournamentName: input.tournamentName,
          occurredAt
        }
      });
    }
  }
}

import type { KohRankingsBoard } from "@padel/shared";
import { isKingOfTheCourtMode } from "@padel/shared";

import { logger } from "../../../../lib/logger.js";
import { prisma } from "../../../../lib/prisma.js";
import { notFound, validation } from "../../../../shared/kernel/appError.js";
import type { KohTournamentHub } from "../../domain/types.js";
import { kohInclude, type KohDbTournament } from "../mappers/kohInclude.js";
import { toHub } from "../mappers/kohHubMapper.js";
import { buildKohRankingsBoard } from "../mappers/kohRankingsMapper.js";

export async function loadKohRow(tournamentId: string): Promise<KohDbTournament | null> {
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: kohInclude
  });
}

/** Load a King of the Court aggregate the organizer owns, or throw the 404-mapped messages clients expect. */
export async function requireKohTournament(
  tournamentId: string,
  organizerId: string
): Promise<KohDbTournament> {
  const row = await loadKohRow(tournamentId);
  if (!row || !isKingOfTheCourtMode(row.mode)) {
    logger.debug("requireKohTournament: missing or not King of the Court", {
      tournamentId,
      mode: row?.mode
    });
    throw notFound("King of the Court tournament not found.");
  }
  if (row.organizerId !== organizerId) {
    logger.debug("requireKohTournament: organizer mismatch", { tournamentId });
    throw notFound("Tournament not found.");
  }
  return row;
}

export function assertKohLive(row: KohDbTournament): void {
  if (row.endedAt) {
    throw validation("This King of the Court night has ended.");
  }
}

export async function getKohHub(
  tournamentId: string,
  organizerId?: string
): Promise<KohTournamentHub> {
  const row = await loadKohRow(tournamentId);
  if (!row || !isKingOfTheCourtMode(row.mode)) {
    throw notFound("King of the Court tournament not found.");
  }
  if (organizerId !== undefined && row.organizerId !== organizerId) {
    throw notFound("Tournament not found.");
  }
  return toHub(row);
}

export async function getKohRankings(
  tournamentId: string,
  organizerId: string,
  courtNumber?: number
): Promise<KohRankingsBoard> {
  const row = await requireKohTournament(tournamentId, organizerId);
  return buildKohRankingsBoard(row, courtNumber);
}

async function findKohIdByPublicToken(publicToken: string): Promise<string | null> {
  const meta = await prisma.tournament.findUnique({
    where: { publicToken },
    select: { id: true, mode: true }
  });
  if (!meta || !isKingOfTheCourtMode(meta.mode)) {
    return null;
  }
  return meta.id;
}

export async function getKohHubByPublicToken(publicToken: string): Promise<KohTournamentHub | null> {
  const id = await findKohIdByPublicToken(publicToken);
  return id === null ? null : getKohHub(id);
}

export async function getKohRankingsByPublicToken(
  publicToken: string,
  courtNumber?: number
): Promise<KohRankingsBoard | null> {
  const id = await findKohIdByPublicToken(publicToken);
  if (id === null) {
    return null;
  }
  const row = await loadKohRow(id);
  if (!row) {
    return null;
  }
  return buildKohRankingsBoard(row, courtNumber);
}

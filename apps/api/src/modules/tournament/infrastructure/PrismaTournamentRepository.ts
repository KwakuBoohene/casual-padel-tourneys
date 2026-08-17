import { isKingOfTheCourtMode } from "@padel/shared";
import { logger } from "../../../lib/logger.js";
import { prisma } from "../../../lib/prisma.js";
import { conflict, notFound } from "../../../shared/kernel/appError.js";
import type { TournamentState } from "../../../types/state.js";
import type { TournamentRepository } from "../application/ports.js";
import {
  mapDbTournamentToState,
  tournamentInclude,
  type DbTournamentGraph
} from "./mappers/tournamentMapper.js";
import {
  nestedPlayers,
  nestedRounds,
  scalarTournamentData
} from "./mappers/tournamentWriteMapper.js";
import { hardDeleteTournament } from "./hardDeleteTournament.js";

export class PrismaTournamentRepository implements TournamentRepository {
  async getById(id: string): Promise<TournamentState | null> {
    const row = await prisma.tournament.findUnique({
      where: { id },
      include: tournamentInclude
    });
    if (!row) {
      logger.debug("PrismaTournamentRepository.getById: missing", { id });
      return null;
    }
    if (isKingOfTheCourtMode(row.mode)) {
      logger.debug("PrismaTournamentRepository.getById: skipped King of the Court", {
        id,
        mode: row.mode
      });
      return null;
    }
    return mapDbTournamentToState(row as DbTournamentGraph);
  }

  async getByPublicToken(token: string): Promise<TournamentState | null> {
    const row = await prisma.tournament.findUnique({
      where: { publicToken: token },
      include: tournamentInclude
    });
    if (!row || isKingOfTheCourtMode(row.mode)) {
      return null;
    }
    return mapDbTournamentToState(row as DbTournamentGraph);
  }

  async listByOrganizer(organizerId: string): Promise<TournamentState[]> {
    const rows = await prisma.tournament.findMany({
      where: { organizerId },
      include: tournamentInclude,
      orderBy: { createdAt: "desc" }
    });
    return rows.map((row) => mapDbTournamentToState(row as DbTournamentGraph));
  }

  async create(state: TournamentState): Promise<void> {
    await prisma.tournament.create({
      data: {
        id: state.id,
        publicToken: state.publicToken,
        organizerId: state.organizerId ?? null,
        createdAt: new Date(state.createdAt),
        contributeToCareerLeaderboard: state.config.contributeToCareerLeaderboard ?? true,
        ...scalarTournamentData(state),
        players: { create: nestedPlayers(state) },
        rounds: { create: nestedRounds(state) }
      }
    });
  }

  async save(state: TournamentState, expectedVersion: number): Promise<void> {
    const updated = await prisma.tournament.updateMany({
      where: { id: state.id, version: expectedVersion },
      data: { version: state.version, updatedAt: new Date(state.updatedAt) }
    });
    if (updated.count === 0) {
      const exists = await prisma.tournament.findUnique({
        where: { id: state.id },
        select: { id: true }
      });
      if (!exists) {
        throw notFound("Tournament not found.");
      }
      throw conflict("Version mismatch. Refresh tournament data.");
    }

    await prisma.player.deleteMany({ where: { tournamentId: state.id } });
    await prisma.round.deleteMany({ where: { tournamentId: state.id } });
    await prisma.pendingPlayer.deleteMany({ where: { tournamentId: state.id } });

    await prisma.tournament.update({
      where: { id: state.id },
      data: {
        ...scalarTournamentData(state),
        players: { create: nestedPlayers(state) },
        pendingPlayers: {
          create: state.pendingPlayers.map((pp) => ({
            id: pp.id,
            name: pp.name,
            gender: pp.gender ?? null,
            createdAt: new Date(pp.createdAt)
          }))
        },
        rounds: { create: nestedRounds(state) }
      }
    });
  }

  async delete(id: string, options?: { stripCareer?: boolean }): Promise<void> {
    try {
      await hardDeleteTournament(id, options?.stripCareer === true);
    } catch {
      throw notFound("Tournament not found.");
    }
  }
}

import type { Prisma } from "@prisma/client";

import { prisma } from "../../../lib/prisma.js";
import type { DraftRepository } from "../application/ports.js";
import type { DraftRecord } from "../domain/draftView.js";

const draftSelect = {
  id: true,
  organizerId: true,
  name: true,
  mode: true,
  payload: true,
  version: true,
  keepAccessAfterStart: true,
  startedTournamentId: true,
  updatedAt: true,
  updatedBy: { select: { id: true, name: true } }
} satisfies Prisma.TournamentDraftSelect;

export const LIST_DRAFTS_LIMIT = 100;

const json = (payload: unknown) => payload as Prisma.InputJsonValue;

/** Joins the request transaction via the `prisma` proxy (organizer mutation work). */
export const draftRepository: DraftRepository = {
  async create(input) {
    return prisma.tournamentDraft.create({
      data: {
        organizerId: input.organizerId,
        name: input.name,
        mode: input.mode,
        payload: json(input.payload),
        createdById: input.actorId,
        updatedById: input.actorId
      },
      select: draftSelect
    });
  },

  async findActive(id): Promise<DraftRecord | null> {
    return prisma.tournamentDraft.findFirst({ where: { id, deletedAt: null }, select: draftSelect });
  },

  async listOpen(organizerId) {
    return prisma.tournamentDraft.findMany({
      where: { organizerId, deletedAt: null, startedTournamentId: null },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: LIST_DRAFTS_LIMIT,
      select: draftSelect
    });
  },

  async updateIfVersion(id, expectedVersion, input) {
    const result = await prisma.tournamentDraft.updateMany({
      where: { id, version: expectedVersion, deletedAt: null, startedTournamentId: null },
      data: {
        name: input.name,
        mode: input.mode,
        payload: json(input.payload),
        updatedById: input.actorId,
        version: { increment: 1 }
      }
    });
    return result.count === 1;
  },

  async lockForStart(id) {
    await prisma.$queryRaw`SELECT "id" FROM "TournamentDraft" WHERE "id" = ${id} FOR UPDATE`;
    return prisma.tournamentDraft.findFirst({ where: { id, deletedAt: null }, select: draftSelect });
  },

  async markStarted(id, expectedVersion, tournamentId) {
    const result = await prisma.tournamentDraft.updateMany({
      where: { id, version: expectedVersion, deletedAt: null, startedTournamentId: null },
      data: { startedTournamentId: tournamentId, version: { increment: 1 } }
    });
    return result.count === 1;
  },

  async softDelete(id) {
    const result = await prisma.tournamentDraft.updateMany({
      where: { id, deletedAt: null, startedTournamentId: null },
      data: { deletedAt: new Date() }
    });
    return result.count === 1;
  }
};

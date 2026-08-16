import type { FastifyInstance } from "fastify";
import { prisma } from "../../../lib/prisma.js";
import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import {
  getKohHub,
  getKohHubByPublicToken,
  getKohRankingsByPublicToken
} from "../../koh/application/readKohHub.js";
import { PrismaKohRepository } from "../../koh/infrastructure/PrismaKohRepository.js";
import type { TournamentModuleDeps } from "../application/ports.js";

export function registerTournamentQueryRoutes(
  server: FastifyInstance,
  deps: TournamentModuleDeps
): void {
  // KOH hubs are a separate aggregate; reads here delegate to the KOH module.
  const koh = { repo: new PrismaKohRepository() };

  server.get("/health", async () => ({ status: "ok" }));

  server.get("/tournaments", { preHandler: requireOrganizerAccess }, async (request) => {
    if (!request.user) {
      return { data: [] };
    }
    const data = await deps.repo.listByOrganizer(request.user.id);
    request.log.info({ count: data.length }, "GET /tournaments");
    return { data };
  });

  server.get("/tournaments/:id", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const params = request.params as { id: string };
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }

    try {
      const row = await prisma.tournament.findUnique({
        where: { id: params.id },
        select: { mode: true }
      });
      if (row?.mode === "KING_OF_THE_HILL") {
        const data = await getKohHub(koh, {
          tournamentId: params.id,
          organizerId: request.user.id
        });
        request.log.info({ id: params.id }, "GET /tournaments/:id KOH hub");
        return { data };
      }
      const data = await deps.repo.getById(params.id);
      if (!data || data.organizerId !== request.user.id) {
        reply.status(404);
        return { message: "Tournament not found." };
      }
      request.log.info({ id: params.id }, "GET /tournaments/:id");
      return { data };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });

  server.get("/public/:token", async (request, reply) => {
    const params = request.params as { token: string };

    const meta = await prisma.tournament.findUnique({
      where: { publicToken: params.token },
      select: { id: true, mode: true }
    });
    if (!meta) {
      reply.status(404);
      return { message: "Public tournament not found." };
    }

    if (meta.mode === "KING_OF_THE_HILL") {
      const hub = await getKohHubByPublicToken(koh, params.token);
      if (!hub) {
        reply.status(404);
        return { message: "Public tournament not found." };
      }
      const { organizerId: _organizerId, ...publicData } = hub;
      return { data: publicData };
    }

    const state = await deps.repo.getByPublicToken(params.token);
    if (!state) {
      reply.status(404);
      return { message: "Public tournament not found." };
    }
    const { organizerId: _organizerId, ...publicData } = state;
    request.log.info({ token: params.token }, "GET /public/:token");
    return { data: publicData };
  });

  server.get("/public/:token/rankings", async (request, reply) => {
    const params = request.params as { token: string };
    const query = request.query as { courtNumber?: string };
    let courtNumber: number | undefined;
    if (query.courtNumber !== undefined && query.courtNumber !== "") {
      courtNumber = Number(query.courtNumber);
      if (!Number.isInteger(courtNumber) || courtNumber < 1) {
        reply.status(400);
        return { message: "courtNumber must be a positive integer." };
      }
    }
    try {
      const data = await getKohRankingsByPublicToken(koh, params.token, courtNumber);
      if (!data) {
        reply.status(404);
        return { message: "Public tournament not found." };
      }
      return { data };
    } catch (error) {
      reply.status(400);
      return { message: (error as Error).message || "Rankings failed." };
    }
  });

  server.get("/players/suggestions", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    if (!request.user) {
      reply.status(401);
      return { names: [] };
    }
    const rows = await prisma.player.findMany({
      where: { tournament: { organizerId: request.user.id } },
      select: { name: true },
      distinct: ["name"],
      orderBy: { name: "asc" }
    });
    return { names: rows.map((row: { name: string }) => row.name) };
  });
}

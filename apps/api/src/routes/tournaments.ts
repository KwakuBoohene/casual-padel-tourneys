import type { FastifyInstance } from "fastify";
import {
  adjustCourtsSchema,
  createTournamentSchema,
  renamePlayerSchema,
  submitScoreSchema,
  substitutePlayerSchema
} from "@padel/shared";

import {
  adjustCourts,
  assertVersion,
  createTournament,
  getTournament,
  getTournamentByPublicToken,
  listTournaments,
  renamePlayer,
  submitScore,
  substitutePlayer
} from "../lib/store.js";
import { requireOrganizerAuth } from "../lib/auth.js";
import { publishEvent } from "../realtime/events.js";
import { broadcastToTournament } from "../realtime/socketHub.js";

export async function registerTournamentRoutes(server: FastifyInstance): Promise<void> {
  server.get("/health", async () => ({ status: "ok" }));

  server.get("/tournaments", async () => ({ data: listTournaments() }));

  server.get("/tournaments/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const tournament = getTournament(params.id);
    if (!tournament) {
      reply.status(404);
      return { message: "Tournament not found." };
    }
    return { data: tournament };
  });

  server.get("/public/:token", async (request, reply) => {
    const params = request.params as { token: string };
    const tournament = getTournamentByPublicToken(params.token);
    if (!tournament) {
      reply.status(404);
      return { message: "Public tournament not found." };
    }
    return { data: tournament };
  });

  server.post("/tournaments", { preHandler: requireOrganizerAuth }, async (request, reply) => {
    const parsed = createTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    const tournament = createTournament(parsed.data);
    const event = { type: "TOURNAMENT_CREATED" as const, tournamentId: tournament.id, payload: tournament };
    await publishEvent(server.redis, event);
    broadcastToTournament(server.subscriptions, tournament.id, event);
    return { data: tournament };
  });

  server.post("/tournaments/score", { preHandler: requireOrganizerAuth }, async (request, reply) => {
    const parsed = submitScoreSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      assertVersion(parsed.data.tournamentId, parsed.data.expectedVersion);
      const tournament = submitScore(parsed.data.tournamentId, parsed.data.matchId, parsed.data.scoreA, parsed.data.scoreB);
      const event = { type: "SCORE_SUBMITTED" as const, tournamentId: tournament.id, payload: tournament };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      return { data: tournament };
    } catch (error) {
      reply.status(409);
      return { message: (error as Error).message };
    }
  });

  server.post("/tournaments/rename-player", { preHandler: requireOrganizerAuth }, async (request, reply) => {
    const parsed = renamePlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const tournament = renamePlayer(parsed.data.tournamentId, parsed.data.playerId, parsed.data.newName);
      const event = { type: "PLAYER_RENAMED" as const, tournamentId: tournament.id, payload: tournament };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      return { data: tournament };
    } catch (error) {
      reply.status(404);
      return { message: (error as Error).message };
    }
  });

  server.post("/tournaments/adjust-courts", { preHandler: requireOrganizerAuth }, async (request, reply) => {
    const parsed = adjustCourtsSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      assertVersion(parsed.data.tournamentId, parsed.data.expectedVersion);
      const tournament = adjustCourts(parsed.data.tournamentId, parsed.data.courts);
      const event = { type: "COURTS_ADJUSTED" as const, tournamentId: tournament.id, payload: tournament };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      return { data: tournament };
    } catch (error) {
      reply.status(409);
      return { message: (error as Error).message };
    }
  });

  server.post("/tournaments/substitute-player", { preHandler: requireOrganizerAuth }, async (request, reply) => {
    const parsed = substitutePlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const tournament = substitutePlayer(parsed.data.tournamentId, parsed.data.playerId, parsed.data.replacementName);
      const event = { type: "PLAYER_SUBSTITUTED" as const, tournamentId: tournament.id, payload: tournament };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, tournament.id, event);
      return { data: tournament };
    } catch (error) {
      reply.status(404);
      return { message: (error as Error).message };
    }
  });
}

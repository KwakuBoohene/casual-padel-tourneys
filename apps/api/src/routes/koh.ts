import type { FastifyInstance } from "fastify";
import {
  assignKohCourtsSchema,
  createKohTournamentSchema,
  promoteKohPickSchema,
  reorderKohQueueSchema,
  submitKohScoreSchema,
  swapKohUnitSchema
} from "@padel/shared";

import { requireOrganizerAccess } from "../lib/auth.js";
import {
  assignKohCourts,
  createKohTournament,
  getKohHub,
  KohVersionConflictError,
  pickKohPromotion,
  randomizeKohCourtQueue,
  reorderKohCourtQueue,
  submitKohCourtScore,
  swapKohCourtSlot
} from "../lib/kohStore.js";
import { publishEvent } from "../realtime/events.js";
import { broadcastToTournament } from "../realtime/socketHub.js";

function isNotFoundMessage(message: string): boolean {
  return message === "KOH tournament not found." || message === "Tournament not found.";
}

function versionConflictReply(
  reply: { status: (code: number) => unknown },
  error: KohVersionConflictError
) {
  reply.status(409);
  return {
    message: error.message,
    expectedVersion: error.expectedVersion,
    actualVersion: error.actualVersion
  };
}

export async function registerKohRoutes(server: FastifyInstance): Promise<void> {
  server.get("/koh/tournaments/:id", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const params = request.params as { id: string };
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }
    try {
      const data = await getKohHub(params.id, request.user.id);
      request.log.info({ id: params.id }, "GET /koh/tournaments/:id");
      return { data };
    } catch (error) {
      const message = (error as Error).message || "Tournament not found.";
      reply.status(isNotFoundMessage(message) ? 404 : 400);
      return { message };
    }
  });

  server.put("/koh/tournaments/:id/assignment", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = assignKohCourtsSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }
    try {
      for (const court of parsed.data.courts) {
        if (court.units.length === 1) {
          reply.status(400);
          return { message: "A court needs 0 (empty) or at least 2 doubles units." };
        }
      }
      const data = await assignKohCourts(params.id, request.user.id, parsed.data);
      const event = { type: "KOH_ASSIGNMENT_UPDATED" as const, tournamentId: data.id, payload: data };
      await publishEvent(server.redis, event);
      broadcastToTournament(server.subscriptions, data.id, event);
      request.log.info({ id: params.id, ready: data.ready }, "PUT /koh/tournaments/:id/assignment");
      return { data };
    } catch (error) {
      const message = (error as Error).message || "Assignment failed.";
      reply.status(isNotFoundMessage(message) ? 404 : 400);
      return { message };
    }
  });

  server.post(
    "/koh/tournaments/:id/courts/:courtNumber/randomize",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string; courtNumber: string };
      const courtNumber = Number(params.courtNumber);
      if (!Number.isInteger(courtNumber) || courtNumber < 1) {
        reply.status(400);
        return { message: "courtNumber must be a positive integer." };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        const data = await randomizeKohCourtQueue(params.id, request.user.id, courtNumber);
        const event = { type: "KOH_QUEUE_RANDOMIZED" as const, tournamentId: data.id, payload: data };
        await publishEvent(server.redis, event);
        broadcastToTournament(server.subscriptions, data.id, event);
        request.log.info({ id: params.id, courtNumber }, "POST .../randomize");
        return { data };
      } catch (error) {
        const message = (error as Error).message || "Randomize failed.";
        reply.status(isNotFoundMessage(message) ? 404 : 400);
        return { message };
      }
    }
  );

  server.put(
    "/koh/tournaments/:id/courts/:courtNumber/queue",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string; courtNumber: string };
      const courtNumber = Number(params.courtNumber);
      const parsed = reorderKohQueueSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      if (!Number.isInteger(courtNumber) || courtNumber < 1) {
        reply.status(400);
        return { message: "courtNumber must be a positive integer." };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        const data = await reorderKohCourtQueue(params.id, request.user.id, courtNumber, parsed.data.unitIds);
        const event = { type: "KOH_QUEUE_REORDERED" as const, tournamentId: data.id, payload: data };
        await publishEvent(server.redis, event);
        broadcastToTournament(server.subscriptions, data.id, event);
        request.log.info({ id: params.id, courtNumber }, "PUT .../queue");
        return { data };
      } catch (error) {
        const message = (error as Error).message || "Reorder failed.";
        reply.status(isNotFoundMessage(message) ? 404 : 400);
        return { message };
      }
    }
  );

  server.post(
    "/koh/tournaments/:id/courts/:courtId/score",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string; courtId: string };
      const parsed = submitKohScoreSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        const data = await submitKohCourtScore(params.id, request.user.id, params.courtId, parsed.data);
        const scoreEvent = {
          type: "KOH_SCORE_SUBMITTED" as const,
          tournamentId: data.id,
          payload: data
        };
        await publishEvent(server.redis, scoreEvent);
        broadcastToTournament(server.subscriptions, data.id, scoreEvent);
        if (data.lastCourtChange) {
          const changeEvent = {
            type: "KOH_COURT_CHANGE" as const,
            tournamentId: data.id,
            payload: data
          };
          await publishEvent(server.redis, changeEvent);
          broadcastToTournament(server.subscriptions, data.id, changeEvent);
        }
        request.log.info(
          { id: params.id, courtId: params.courtId, status: parsed.data.status },
          "POST .../score"
        );
        return { data };
      } catch (error) {
        if (error instanceof KohVersionConflictError) {
          return versionConflictReply(reply, error);
        }
        const message = (error as Error).message || "Score submit failed.";
        reply.status(isNotFoundMessage(message) ? 404 : 400);
        return { message };
      }
    }
  );

  server.post(
    "/koh/tournaments/:id/courts/:courtId/swap",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string; courtId: string };
      const parsed = swapKohUnitSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        const data = await swapKohCourtSlot(params.id, request.user.id, params.courtId, parsed.data);
        const event = { type: "KOH_SWAP_APPLIED" as const, tournamentId: data.id, payload: data };
        await publishEvent(server.redis, event);
        broadcastToTournament(server.subscriptions, data.id, event);
        request.log.info(
          { id: params.id, courtId: params.courtId, slot: parsed.data.slot },
          "POST .../swap"
        );
        return { data };
      } catch (error) {
        if (error instanceof KohVersionConflictError) {
          return versionConflictReply(reply, error);
        }
        const message = (error as Error).message || "Swap failed.";
        reply.status(isNotFoundMessage(message) ? 404 : 400);
        return { message };
      }
    }
  );

  server.post(
    "/koh/tournaments/:id/promote/pick",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string };
      const parsed = promoteKohPickSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        const data = await pickKohPromotion(params.id, request.user.id, parsed.data);
        const event = {
          type: "KOH_COURT_CHANGE" as const,
          tournamentId: data.id,
          payload: data
        };
        await publishEvent(server.redis, event);
        broadcastToTournament(server.subscriptions, data.id, event);
        request.log.info({ id: params.id }, "POST .../promote/pick");
        return { data };
      } catch (error) {
        if (error instanceof KohVersionConflictError) {
          return versionConflictReply(reply, error);
        }
        const message = (error as Error).message || "Promote pick failed.";
        reply.status(isNotFoundMessage(message) ? 404 : 400);
        return { message };
      }
    }
  );
}

/** Used by POST /tournaments when body.mode is KING_OF_THE_HILL. */
export async function handleCreateKohTournament(
  server: FastifyInstance,
  body: unknown,
  organizerId: string
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const parsed = createKohTournamentSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, payload: { errors: parsed.error.flatten() } };
  }
  const data = await createKohTournament(parsed.data, organizerId);
  const event = { type: "TOURNAMENT_CREATED" as const, tournamentId: data.id, payload: data };
  await publishEvent(server.redis, event);
  broadcastToTournament(server.subscriptions, data.id, event);
  return { status: 200, payload: { data } };
}

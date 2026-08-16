import type { FastifyInstance } from "fastify";
import { assignKohCourtsSchema, reorderKohQueueSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { assignKohCourts } from "../application/assignKohCourts.js";
import { randomizeKohQueue, reorderKohQueue } from "../application/kohQueue.js";
import type { KohModuleDeps } from "../application/ports.js";
import { parseCourtNumber } from "./kohParams.js";
import { mapKohError } from "./mapKohError.js";

export function registerKohQueueRoutes(server: FastifyInstance, deps: KohModuleDeps): void {
  server.put(
    "/koh/tournaments/:id/assignment",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
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
        const data = await assignKohCourts(deps, {
          tournamentId: params.id,
          organizerId: request.user.id,
          assignment: parsed.data
        });
        request.log.info({ id: params.id, ready: data.ready }, "PUT /koh/tournaments/:id/assignment");
        return { data };
      } catch (error) {
        return mapKohError(reply, error, "Assignment failed.");
      }
    }
  );

  server.post(
    "/koh/tournaments/:id/courts/:courtNumber/randomize",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string; courtNumber: string };
      const court = parseCourtNumber(params.courtNumber);
      if (!court.ok) {
        reply.status(400);
        return { message: court.message };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        const data = await randomizeKohQueue(deps, {
          tournamentId: params.id,
          organizerId: request.user.id,
          courtNumber: court.courtNumber
        });
        request.log.info({ id: params.id, courtNumber: court.courtNumber }, "POST .../randomize");
        return { data };
      } catch (error) {
        return mapKohError(reply, error, "Randomize failed.");
      }
    }
  );

  server.put(
    "/koh/tournaments/:id/courts/:courtNumber/queue",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string; courtNumber: string };
      const parsed = reorderKohQueueSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      const court = parseCourtNumber(params.courtNumber);
      if (!court.ok) {
        reply.status(400);
        return { message: court.message };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        const data = await reorderKohQueue(deps, {
          tournamentId: params.id,
          organizerId: request.user.id,
          courtNumber: court.courtNumber,
          unitIds: parsed.data.unitIds
        });
        request.log.info({ id: params.id, courtNumber: court.courtNumber }, "PUT .../queue");
        return { data };
      } catch (error) {
        return mapKohError(reply, error, "Reorder failed.");
      }
    }
  );
}

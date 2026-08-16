import type { FastifyInstance } from "fastify";
import { promoteKohPickSchema, submitKohScoreSchema, swapKohUnitSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { pickKohPromotion, swapKohSlot } from "../application/kohCourtChanges.js";
import type { KohModuleDeps } from "../application/ports.js";
import { submitKohScore } from "../application/submitKohScore.js";
import { mapKohError } from "./mapKohError.js";

export function registerKohScoreRoutes(server: FastifyInstance, deps: KohModuleDeps): void {
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
        const data = await submitKohScore(deps, {
          tournamentId: params.id,
          organizerId: request.user.id,
          courtId: params.courtId,
          score: parsed.data
        });
        request.log.info(
          { id: params.id, courtId: params.courtId, status: parsed.data.status },
          "POST .../score"
        );
        return { data };
      } catch (error) {
        return mapKohError(reply, error, "Score submit failed.");
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
        const data = await swapKohSlot(deps, {
          tournamentId: params.id,
          organizerId: request.user.id,
          courtId: params.courtId,
          swap: parsed.data
        });
        request.log.info(
          { id: params.id, courtId: params.courtId, slot: parsed.data.slot },
          "POST .../swap"
        );
        return { data };
      } catch (error) {
        return mapKohError(reply, error, "Swap failed.");
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
        const data = await pickKohPromotion(deps, {
          tournamentId: params.id,
          organizerId: request.user.id,
          pick: parsed.data
        });
        request.log.info({ id: params.id }, "POST .../promote/pick");
        return { data };
      } catch (error) {
        return mapKohError(reply, error, "Promote pick failed.");
      }
    }
  );
}

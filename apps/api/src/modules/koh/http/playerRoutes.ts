import type { FastifyInstance } from "fastify";
import { renameKohPlayerSchema, replaceKohPartnerSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { renameKohPlayer, replaceKohPartner } from "../application/kohPlayers.js";
import type { KohModuleDeps } from "../application/ports.js";
import { mapKohError } from "./mapKohError.js";

export function registerKohPlayerRoutes(server: FastifyInstance, deps: KohModuleDeps): void {
  server.post(
    "/koh/tournaments/:id/players/:playerId/rename",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string; playerId: string };
      const parsed = renameKohPlayerSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        const data = await renameKohPlayer(deps, {
          tournamentId: params.id,
          organizerId: request.user.id,
          playerId: params.playerId,
          rename: parsed.data
        });
        request.log.info({ id: params.id, playerId: params.playerId }, "POST .../players/.../rename");
        return { data };
      } catch (error) {
        return mapKohError(reply, error, "Rename failed.");
      }
    }
  );

  server.post(
    "/koh/tournaments/:id/units/:unitId/replace-partner",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string; unitId: string };
      const parsed = replaceKohPartnerSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      try {
        const data = await replaceKohPartner(deps, {
          tournamentId: params.id,
          organizerId: request.user.id,
          unitId: params.unitId,
          replacement: parsed.data
        });
        request.log.info({ id: params.id, unitId: params.unitId }, "POST .../replace-partner");
        return { data };
      } catch (error) {
        return mapKohError(reply, error, "Replace partner failed.");
      }
    }
  );
}

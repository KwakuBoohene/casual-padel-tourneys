import type { FastifyInstance } from "fastify";
import { closeTournamentSchema, isKingOfTheCourtMode } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { prisma } from "../../../lib/prisma.js";
import { notFound } from "../../../shared/kernel/appError.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { handleCloseKohTournament } from "../../koh/http/closeKoh.js";
import { closeTournament } from "../application/closeTournament.js";
import { stripVoidedMatchCareerDeltas } from "../infrastructure/stripVoidedMatchCareerDeltas.js";
import type { TournamentModuleDeps } from "../application/ports.js";

/**
 * Close a live event for any mode. King of the Court owns a separate aggregate, so this
 * route branches on mode the same way the create and read routes already do.
 */
export function registerTournamentCloseRoutes(
  server: FastifyInstance,
  deps: TournamentModuleDeps
): void {
  server.post("/tournaments/:id/close", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const params = request.params as { id: string };
    const parsed = closeTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }
    try {
      const meta = await prisma.tournament.findUnique({
        where: { id: params.id },
        select: { mode: true, organizerId: true }
      });
      if (!meta || meta.organizerId !== request.user.id) {
        throw notFound("Tournament not found.");
      }
      let data: { tournament: unknown; voidedMatchCount: number };
      if (isKingOfTheCourtMode(meta.mode)) {
        data = await handleCloseKohTournament(
          server,
          params.id,
          request.user.id,
          parsed.data.expectedVersion
        );
      } else {
        const result = await closeTournament(deps, {
          tournamentId: params.id,
          organizerId: request.user.id,
          expectedVersion: parsed.data.expectedVersion
        });
        await stripVoidedMatchCareerDeltas(params.id);
        data = { tournament: result.tournament, voidedMatchCount: result.voidedMatchCount };
      }
      request.log.info(
        { id: params.id, mode: meta.mode, voidedMatchCount: data.voidedMatchCount },
        "POST /tournaments/:id/close"
      );
      return { data };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });
}

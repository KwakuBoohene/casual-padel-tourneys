import type { FastifyInstance } from "fastify";
import {
  addPendingPlayerSchema,
  adjustCourtsSchema,
  integratePendingPlayersSchema,
  renamePlayerSchema,
  renameTournamentSchema,
  substitutePlayerSchema
} from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { addPendingPlayer, integratePendingPlayers } from "../application/liveMutations.js";
import {
  adjustCourts,
  renamePlayer,
  renameTournament,
  substitutePlayer
} from "../application/renameAndCourts.js";
import type { TournamentModuleDeps } from "../application/ports.js";

export function registerTournamentEditRoutes(
  server: FastifyInstance,
  deps: TournamentModuleDeps
): void {
  server.post("/tournaments/rename-player", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = renamePlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const tournament = await renamePlayer(deps, {
        tournamentId: parsed.data.tournamentId,
        organizerId: request.user!.id,
        playerId: parsed.data.playerId,
        newName: parsed.data.newName
      });
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });

  server.post("/tournaments/rename", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = renameTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const tournament = await renameTournament(deps, {
        tournamentId: parsed.data.tournamentId,
        organizerId: request.user!.id,
        newName: parsed.data.newName
      });
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });

  server.post("/tournaments/adjust-courts", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = adjustCourtsSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const tournament = await adjustCourts(deps, {
        tournamentId: parsed.data.tournamentId,
        organizerId: request.user!.id,
        expectedVersion: parsed.data.expectedVersion,
        courts: parsed.data.courts
      });
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });

  server.post("/tournaments/substitute-player", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = substitutePlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const tournament = await substitutePlayer(deps, {
        tournamentId: parsed.data.tournamentId,
        organizerId: request.user!.id,
        playerId: parsed.data.playerId,
        replacementName: parsed.data.replacementName
      });
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });

  server.post("/tournaments/add-pending-player", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = addPendingPlayerSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const tournament = await addPendingPlayer(deps, {
        tournamentId: parsed.data.tournamentId,
        organizerId: request.user!.id,
        expectedVersion: parsed.data.expectedVersion,
        name: parsed.data.name,
        gender: parsed.data.gender
      });
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });

  server.post("/tournaments/integrate-pending", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = integratePendingPlayersSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const tournament = await integratePendingPlayers(deps, {
        tournamentId: parsed.data.tournamentId,
        organizerId: request.user!.id,
        expectedVersion: parsed.data.expectedVersion
      });
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });
}

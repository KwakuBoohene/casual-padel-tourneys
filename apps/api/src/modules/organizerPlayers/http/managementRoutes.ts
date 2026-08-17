import type { FastifyInstance } from "fastify";
import {
  mergeOrganizerPlayersSchema,
  organizerPlayerStatusSchema
} from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import type { OrganizerPlayersDeps } from "../application/ports.js";
import {
  archiveOrganizerPlayer,
  listManagedOrganizerPlayers,
  mergeOrganizerPlayers,
  unarchiveOrganizerPlayer
} from "../application/manageOrganizerPlayers.js";

const GUEST_MESSAGE = "Attach an account to manage player careers.";

function requireSignedIn(
  request: { user?: { id: string; isGuest?: boolean } | null },
  reply: { status: (code: number) => void }
): { id: string } | null {
  if (!request.user) {
    reply.status(401);
    return null;
  }
  if (request.user.isGuest) {
    reply.status(403);
    return null;
  }
  return request.user;
}

export function registerOrganizerPlayerManagementRoutes(
  server: FastifyInstance,
  deps: OrganizerPlayersDeps
): void {
  server.get("/me/players", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }
    if (request.user.isGuest) {
      return { data: { players: [], guest: true, message: GUEST_MESSAGE } };
    }
    const parsed = organizerPlayerStatusSchema.safeParse(
      (request.query as { status?: string }).status ?? "active"
    );
    if (!parsed.success) {
      reply.status(400);
      return { message: "status must be active or archived." };
    }
    const players = await listManagedOrganizerPlayers(deps, request.user.id, parsed.data);
    return { data: { status: parsed.data, players } };
  });

  server.post("/me/players/merge", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const user = requireSignedIn(request, reply);
    if (!user) return { message: request.user ? GUEST_MESSAGE : "Unauthorized" };
    const parsed = mergeOrganizerPlayersSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    try {
      const data = await mergeOrganizerPlayers(deps, user.id, parsed.data);
      return { data };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });

  server.post(
    "/me/players/:id/archive",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const user = requireSignedIn(request, reply);
      if (!user) return { message: request.user ? GUEST_MESSAGE : "Unauthorized" };
      try {
        const params = request.params as { id: string };
        const data = await archiveOrganizerPlayer(deps, user.id, params.id);
        return { data };
      } catch (error) {
        return mapAppError(reply, error);
      }
    }
  );

  server.post(
    "/me/players/:id/unarchive",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const user = requireSignedIn(request, reply);
      if (!user) return { message: request.user ? GUEST_MESSAGE : "Unauthorized" };
      try {
        const params = request.params as { id: string };
        const data = await unarchiveOrganizerPlayer(deps, user.id, params.id);
        return { data };
      } catch (error) {
        return mapAppError(reply, error);
      }
    }
  );
}

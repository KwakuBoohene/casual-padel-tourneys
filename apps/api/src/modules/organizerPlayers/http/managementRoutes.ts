import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  bulkOrganizerPlayerIdsSchema,
  mergeOrganizerPlayersSchema,
  organizerPlayerStatusSchema,
  renameOrganizerPlayerSchema
} from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import type { OrganizerPlayersDeps } from "../application/ports.js";
import {
  archiveOrganizerPlayer,
  archiveOrganizerPlayers,
  listManagedOrganizerPlayers,
  mergeOrganizerPlayers,
  renameOrganizerPlayer,
  unarchiveOrganizerPlayer,
  unarchiveOrganizerPlayers
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

async function withSigned(
  request: FastifyRequest,
  reply: FastifyReply,
  run: (userId: string) => Promise<unknown>
) {
  const user = requireSignedIn(request, reply);
  if (!user) return { message: request.user ? GUEST_MESSAGE : "Unauthorized" };
  try {
    return { data: await run(user.id) };
  } catch (error) {
    return mapAppError(reply, error);
  }
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
    const parsed = mergeOrganizerPlayersSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    return withSigned(request, reply, (id) => mergeOrganizerPlayers(deps, id, parsed.data));
  });

  server.post("/me/players/archive", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = bulkOrganizerPlayerIdsSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    return withSigned(request, reply, (id) =>
      archiveOrganizerPlayers(deps, id, parsed.data.playerIds)
    );
  });

  server.post("/me/players/unarchive", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const parsed = bulkOrganizerPlayerIdsSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }
    return withSigned(request, reply, (id) =>
      unarchiveOrganizerPlayers(deps, id, parsed.data.playerIds)
    );
  });

  server.post(
    "/me/players/:id/archive",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string };
      return withSigned(request, reply, (id) => archiveOrganizerPlayer(deps, id, params.id));
    }
  );

  server.post(
    "/me/players/:id/unarchive",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const params = request.params as { id: string };
      return withSigned(request, reply, (id) => unarchiveOrganizerPlayer(deps, id, params.id));
    }
  );

  server.post(
    "/me/players/:id/rename",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const parsed = renameOrganizerPlayerSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { errors: parsed.error.flatten() };
      }
      const params = request.params as { id: string };
      return withSigned(request, reply, (id) =>
        renameOrganizerPlayer(deps, id, params.id, parsed.data.name)
      );
    }
  );
}

import { organizerId } from "../../organizerAccess/infrastructure/access.js";
import type { FastifyInstance } from "fastify";
import { createTournamentSchema, isKingOfTheCourtMode } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { handleCreateKohTournament } from "../../koh/http/createKoh.js";
import { createTournament } from "../application/createTournament.js";
import { toTournamentConfig } from "../application/toTournamentConfig.js";
import type { TournamentModuleDeps } from "../application/ports.js";
import { ensureOrganizerUser } from "../infrastructure/ensureOrganizerUser.js";

export function registerTournamentCreateRoutes(server: FastifyInstance, deps: TournamentModuleDeps): void {
  server.post("/tournaments", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }

    const body = request.body as { mode?: string } | undefined;
    if (isKingOfTheCourtMode(body?.mode)) {
      const result = await handleCreateKohTournament(server, request.body, organizerId(request));
      reply.status(result.status);
      return result.payload;
    }

    const parsed = createTournamentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    try {
      await ensureOrganizerUser({
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
        isGuest: request.user.isGuest
      });
      const tournament = await createTournament(deps, {
        organizerId: organizerId(request),
        config: toTournamentConfig(parsed.data)
      });
      request.log.info({ id: tournament.id }, "POST /tournaments created");
      return { data: tournament };
    } catch (error) {
      return mapAppError(reply, error);
    }
  });
}

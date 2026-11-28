import type { FastifyInstance } from "fastify";
import { importPadelMixSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { mapAppError } from "../../../shared/http/mapAppError.js";
import { organizerId } from "../../organizerAccess/infrastructure/access.js";
import { importPadelMixTournament } from "../application/importPadelMixTournament.js";
import type { PadelMixSource, TournamentModuleDeps } from "../application/ports.js";
import { ensureOrganizerUser } from "../infrastructure/ensureOrganizerUser.js";

/** Each import makes an outbound request, so it gets a tighter budget than the global limit. */
const IMPORT_RATE_LIMIT = { rateLimit: { max: 10, timeWindow: "1 minute" } } as const;

export function registerTournamentImportRoutes(
  server: FastifyInstance,
  deps: TournamentModuleDeps & { padelMix: PadelMixSource }
): void {
  server.post(
    "/tournaments/import/padelmix",
    { preHandler: requireOrganizerAccess, config: IMPORT_RATE_LIMIT },
    async (request, reply) => {
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      const parsed = importPadelMixSchema.safeParse(request.body);
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
        const tournament = await importPadelMixTournament(deps, {
          organizerId: organizerId(request),
          url: parsed.data.url
        });
        request.log.info({ id: tournament.id }, "POST /tournaments/import/padelmix created");
        return { data: tournament };
      } catch (error) {
        return mapAppError(reply, error);
      }
    }
  );
}

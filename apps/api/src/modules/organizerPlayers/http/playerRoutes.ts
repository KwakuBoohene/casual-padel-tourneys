import type { FastifyInstance } from "fastify";
import { organizerPlayerRangeSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import type { OrganizerPlayersDeps } from "../application/ports.js";
import {
  getOrganizerPlayerDetail,
  getOrganizerPlayerLeaderboard
} from "../application/readOrganizerPlayers.js";

const RANGE_ERROR = "range must be month, year, or all.";

/** Guests have no cross-event career, so they get an explicit nudge instead of empty stats. */
const GUEST_LEADERBOARD = {
  range: "all" as const,
  rows: [],
  guest: true,
  message: "Attach an account to track player careers across events."
};

export function registerOrganizerPlayerRoutes(
  server: FastifyInstance,
  deps: OrganizerPlayersDeps
): void {
  server.get(
    "/me/players/leaderboard",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      if (!request.user) {
        reply.status(401);
        return { message: "Unauthorized" };
      }
      if (request.user.isGuest) {
        return { data: GUEST_LEADERBOARD };
      }

      const query = request.query as { range?: string };
      const parsed = organizerPlayerRangeSchema.safeParse(query.range ?? "year");
      if (!parsed.success) {
        reply.status(400);
        return { message: RANGE_ERROR };
      }

      const data = await getOrganizerPlayerLeaderboard(deps, request.user.id, parsed.data);
      request.log.info({ range: parsed.data, rows: data.rows.length }, "GET /me/players/leaderboard");
      return { data };
    }
  );

  server.get("/me/players/:id", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }
    if (request.user.isGuest) {
      reply.status(403);
      return { message: "Attach an account to view player careers." };
    }

    const params = request.params as { id: string };
    const query = request.query as { range?: string };
    const parsed = organizerPlayerRangeSchema.safeParse(query.range ?? "year");
    if (!parsed.success) {
      reply.status(400);
      return { message: RANGE_ERROR };
    }

    const data = await getOrganizerPlayerDetail(deps, request.user.id, params.id, parsed.data);
    if (!data) {
      reply.status(404);
      return { message: "Player not found." };
    }
    request.log.info({ id: params.id, range: parsed.data }, "GET /me/players/:id");
    return { data };
  });
}

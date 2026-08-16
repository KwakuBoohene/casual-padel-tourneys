import type { FastifyInstance } from "fastify";
import { organizerPlayerLeaderboardQuerySchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import type { OrganizerPlayersDeps } from "../application/ports.js";
import {
  getOrganizerPlayerDetail,
  getOrganizerPlayerLeaderboard
} from "../application/readOrganizerPlayers.js";

const QUERY_ERROR = "Invalid leaderboard query (range, mode, or q).";

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

      const query = request.query as { range?: string; mode?: string; q?: string };
      const parsed = organizerPlayerLeaderboardQuerySchema.safeParse({
        range: query.range ?? "year",
        mode: query.mode ?? "overall",
        q: query.q
      });
      if (!parsed.success) {
        reply.status(400);
        return { message: QUERY_ERROR };
      }

      const data = await getOrganizerPlayerLeaderboard(deps, request.user.id, parsed.data);
      request.log.info(
        { range: parsed.data.range, mode: parsed.data.mode, q: parsed.data.q, rows: data.rows.length },
        "GET /me/players/leaderboard"
      );
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
    const parsed = organizerPlayerLeaderboardQuerySchema.safeParse({
      range: query.range ?? "year",
      mode: "overall"
    });
    if (!parsed.success) {
      reply.status(400);
      return { message: QUERY_ERROR };
    }

    const data = await getOrganizerPlayerDetail(deps, request.user.id, params.id, parsed.data);
    if (!data) {
      reply.status(404);
      return { message: "Player not found." };
    }
    request.log.info({ id: params.id, range: parsed.data.range }, "GET /me/players/:id");
    return { data };
  });
}

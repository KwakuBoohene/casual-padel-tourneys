import type { FastifyInstance } from "fastify";
import { organizerPlayerRangeSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../lib/auth.js";
import {
  getOrganizerPlayerDetail,
  getOrganizerPlayerLeaderboard
} from "../lib/organizerPlayers.js";

export async function registerMePlayerRoutes(server: FastifyInstance): Promise<void> {
  server.get("/me/players/leaderboard", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    if (!request.user) {
      reply.status(401);
      return { message: "Unauthorized" };
    }
    if (request.user.isGuest) {
      return {
        data: {
          range: "all" as const,
          rows: [],
          guest: true,
          message: "Attach an account to track player careers across events."
        }
      };
    }

    const query = request.query as { range?: string };
    const parsed = organizerPlayerRangeSchema.safeParse(query.range ?? "year");
    if (!parsed.success) {
      reply.status(400);
      return { message: "range must be month, year, or all." };
    }

    const data = await getOrganizerPlayerLeaderboard(request.user.id, parsed.data);
    request.log.info({ range: parsed.data, rows: data.rows.length }, "GET /me/players/leaderboard");
    return { data };
  });

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
      return { message: "range must be month, year, or all." };
    }

    const data = await getOrganizerPlayerDetail(request.user.id, params.id, parsed.data);
    if (!data) {
      reply.status(404);
      return { message: "Player not found." };
    }
    request.log.info({ id: params.id, range: parsed.data }, "GET /me/players/:id");
    return { data };
  });
}

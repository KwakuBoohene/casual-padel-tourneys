import type { FastifyInstance } from "fastify";
import {
  ORGANIZER_PLAYER_SEARCH_MAX,
  organizerPlayerLeaderboardQuerySchema,
  organizerPlayerRangeSchema
} from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import type { OrganizerPlayersDeps } from "../application/ports.js";
import {
  getOrganizerPlayerDetail,
  getOrganizerPlayerLeaderboard
} from "../application/readOrganizerPlayers.js";

const RANGE_ERROR = "range must be month, year, or all.";
const MODE_ERROR = "mode must be overall, AMERICANO, MEXICANO, or KING_OF_THE_HILL.";
const SEARCH_ERROR = `q must be at most ${ORGANIZER_PLAYER_SEARCH_MAX} characters.`;

/** Guests have no cross-event career, so they get an explicit nudge instead of empty stats. */
const GUEST_LEADERBOARD = {
  range: "all" as const,
  mode: "overall" as const,
  rows: [],
  guest: true,
  message: "Attach an account to track player careers across events."
};

function queryErrorMessage(field: unknown): string {
  if (field === "mode") return MODE_ERROR;
  if (field === "q") return SEARCH_ERROR;
  return RANGE_ERROR;
}

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
        range: query.range ?? undefined,
        mode: query.mode ?? undefined,
        q: query.q ?? undefined
      });
      if (!parsed.success) {
        reply.status(400);
        return { message: queryErrorMessage(parsed.error.issues[0]?.path[0]) };
      }

      const data = await getOrganizerPlayerLeaderboard(deps, request.user.id, parsed.data);
      request.log.info(
        {
          range: parsed.data.range,
          mode: parsed.data.mode,
          searched: Boolean(parsed.data.q?.trim()),
          rows: data.rows.length
        },
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

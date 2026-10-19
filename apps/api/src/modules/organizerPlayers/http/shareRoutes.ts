import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { organizerPlayerRangeSchema } from "@padel/shared";

import { requireOrganizerAccess } from "../../../lib/auth.js";
import { createShareToken } from "../../../lib/shareTokens.js";
import {
  enableCareerShare,
  getCareerShare,
  revokeCareerShare,
  rotateCareerShare
} from "../application/manageCareerShare.js";
import type { OrganizerPlayersDeps } from "../application/ports.js";
import { readPublicCareerBoard } from "../application/readPublicCareerBoard.js";

/** A leaked link must not be cheap to hammer, and the token space must not be cheap to probe. */
const PUBLIC_CAREER_RATE_LIMIT = {
  rateLimit: { max: 60, timeWindow: "5 minutes" }
} as const;

const GUEST_MESSAGE = "Attach an account to share a leaderboard.";

function makeToken(): string {
  return createShareToken("career");
}

/** Returns null when the caller may not manage a share link. */
function organizerOrReject(request: FastifyRequest, reply: FastifyReply): string | null {
  if (!request.user) {
    reply.status(401);
    return null;
  }
  if (request.user.isGuest) {
    reply.status(403);
    return null;
  }
  return request.user.id;
}

export function registerCareerShareRoutes(
  server: FastifyInstance,
  deps: OrganizerPlayersDeps
): void {
  server.get("/me/career-share", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const organizerId = organizerOrReject(request, reply);
    if (!organizerId) return { message: GUEST_MESSAGE };
    return { data: await getCareerShare(deps, organizerId) };
  });

  server.post("/me/career-share", { preHandler: requireOrganizerAccess }, async (request, reply) => {
    const organizerId = organizerOrReject(request, reply);
    if (!organizerId) return { message: GUEST_MESSAGE };
    const state = await enableCareerShare(deps, organizerId, makeToken);
    // Never log the token itself — it is a capability.
    request.log.info({ shared: true }, "POST /me/career-share");
    return { data: state };
  });

  server.post(
    "/me/career-share/rotate",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const organizerId = organizerOrReject(request, reply);
      if (!organizerId) return { message: GUEST_MESSAGE };
      const state = await rotateCareerShare(deps, organizerId, makeToken);
      request.log.info({ rotated: true }, "POST /me/career-share/rotate");
      return { data: state };
    }
  );

  server.delete(
    "/me/career-share",
    { preHandler: requireOrganizerAccess },
    async (request, reply) => {
      const organizerId = organizerOrReject(request, reply);
      if (!organizerId) return { message: GUEST_MESSAGE };
      const state = await revokeCareerShare(deps, organizerId);
      request.log.info({ revoked: true }, "DELETE /me/career-share");
      return { data: state };
    }
  );

  server.get(
    "/public/career/:token",
    { config: PUBLIC_CAREER_RATE_LIMIT },
    async (request, reply) => {
      const params = request.params as { token: string };
      const parsed = organizerPlayerRangeSchema.safeParse(
        (request.query as { range?: string })?.range ?? "year"
      );
      if (!parsed.success) {
        reply.status(400);
        return { message: "range must be month, year, or all." };
      }
      const board = await readPublicCareerBoard(deps, params.token, parsed.data);
      if (!board) {
        // Same answer for unknown, malformed and revoked: never confirm an account exists.
        reply.status(404);
        return { message: "Leaderboard not found." };
      }
      return { data: board };
    }
  );
}

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../lib/authTypes.js";
import { requireAuth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

interface GoogleAuthBody {
  idToken: string;
}

interface GuestAuthBody {
  guestId: string;
}

function getGoogleAudiences(): string[] {
  const configuredAudiences = [
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID
  ];

  return Array.from(
    new Set(
      configuredAudiences
        .flatMap((value) => value?.split(",") ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export async function registerAuthRoutes(server: FastifyInstance): Promise<void> {
  const googleAudiences = getGoogleAudiences();
  const jwtSecret = process.env.JWT_SECRET;

  const googleClient = googleAudiences.length > 0 ? new OAuth2Client() : null;

  server.post(
    "/auth/google",
    async (request: FastifyRequest<{ Body: GoogleAuthBody }>, reply: FastifyReply): Promise<{
      token: string;
      user: AuthUser & { avatarUrl?: string };
    }> => {
      if (!googleClient || googleAudiences.length === 0 || !jwtSecret) {
        reply.status(500);
        logger.error("POST /auth/google: Google auth not configured", {
          hasClient: Boolean(googleClient),
          googleAudienceCount: googleAudiences.length,
          hasJwtSecret: Boolean(jwtSecret)
        });
        throw new Error("Google auth is not configured on the server.");
      }

      const { idToken } = request.body;
      if (!idToken) {
        reply.status(400);
        logger.warn("POST /auth/google: missing idToken");
        throw new Error("Missing idToken.");
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: googleAudiences
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        reply.status(401);
        logger.warn("POST /auth/google: invalid Google token payload");
        throw new Error("Invalid Google token.");
      }

      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name ?? email;
      const avatarUrl = payload.picture ?? undefined;

      const user = await prisma.user.upsert({
        where: { googleId },
        create: {
          googleId,
          email,
          name,
          avatarUrl
        },
        update: {
          email,
          name,
          avatarUrl
        }
      });

      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          isGuest: false
        },
        jwtSecret,
        {
          expiresIn: "7d"
        }
      );

      logger.info("POST /auth/google: user authenticated", { userId: user.id, email: user.email });
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl ?? undefined,
          isGuest: false
        }
      };
    }
  );

  server.post(
    "/auth/guest",
    async (request: FastifyRequest<{ Body: GuestAuthBody }>, reply: FastifyReply): Promise<{
      token: string;
      user: AuthUser & { avatarUrl?: string };
    }> => {
      if (!jwtSecret) {
        reply.status(500);
        logger.error("POST /auth/guest: JWT_SECRET missing");
        throw new Error("JWT_SECRET is not configured.");
      }

      const { guestId } = request.body;
      if (!guestId || typeof guestId !== "string" || guestId.trim().length === 0) {
        reply.status(400);
        logger.warn("POST /auth/guest: missing guestId");
        throw new Error("Missing guestId.");
      }
      if (!/^[a-zA-Z0-9_-]{8,128}$/.test(guestId)) {
        reply.status(400);
        logger.warn("POST /auth/guest: invalid guestId format");
        throw new Error("Invalid guestId format.");
      }

      const guestEmail = `guest-${guestId}@padel.local`;

      let user = await prisma.user.findUnique({ where: { guestId } });
      if (!user) {
        const suffix = String(Math.floor(1000 + Math.random() * 9000));
        user = await prisma.user.create({
          data: {
            guestId,
            email: guestEmail,
            name: `Guest ${suffix}`,
            isGuest: true
          }
        });
        logger.info("POST /auth/guest: new guest created", { userId: user.id });
      } else {
        logger.info("POST /auth/guest: returning guest authenticated", { userId: user.id });
      }

      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name,
          isGuest: true
        },
        jwtSecret,
        { expiresIn: "7d" }
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isGuest: true
        }
      };
    }
  );

  server.get(
    "/auth/me",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply): Promise<{ user: AuthUser & { avatarUrl?: string } }> => {
      if (!request.user) {
        reply.status(401);
        logger.warn("GET /auth/me: no user on request");
        throw new Error("Unauthenticated.");
      }
      const userRecord = await prisma.user.findUnique({
        where: { id: request.user.id }
      });
      if (!userRecord) {
        reply.status(404);
        logger.warn("GET /auth/me: user not found", { userId: request.user.id });
        throw new Error("User not found.");
      }
      return {
        user: {
          id: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          avatarUrl: userRecord.avatarUrl ?? undefined,
          isGuest: userRecord.isGuest
        }
      };
    }
  );
}


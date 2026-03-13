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

export async function registerAuthRoutes(server: FastifyInstance): Promise<void> {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const jwtSecret = process.env.JWT_SECRET;

  const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

  server.post(
    "/auth/google",
    async (request: FastifyRequest<{ Body: GoogleAuthBody }>, reply: FastifyReply): Promise<{
      token: string;
      user: AuthUser & { avatarUrl?: string };
    }> => {
      if (!googleClient || !googleClientId || !jwtSecret) {
        reply.status(500);
        logger.error("POST /auth/google: Google auth not configured", {
          hasClient: Boolean(googleClient),
          hasClientId: Boolean(googleClientId),
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
        audience: googleClientId
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
          name: user.name
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
          avatarUrl: user.avatarUrl ?? undefined
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
          avatarUrl: userRecord.avatarUrl ?? undefined
        }
      };
    }
  );
}


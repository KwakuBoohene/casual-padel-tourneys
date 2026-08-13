import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import {
  passwordLoginFinishSchema,
  passwordLoginStartSchema,
  passwordRegisterFinishSchema,
  passwordRegisterStartSchema
} from "@padel/shared";

import { logger } from "../lib/logger.js";
import {
  storePasswordLoginAttempt,
  takePasswordLoginAttempt
} from "../lib/passwordLoginAttempts.js";
import {
  ensurePasswordProtocolReady,
  getPasswordServerSetup,
  passwordProtocol
} from "../lib/passwordProtocol.js";
import { prisma } from "../lib/prisma.js";

const VERIFY_DUE_MS = 24 * 60 * 60 * 1000;
const GENERIC_LOGIN_FAILURE = "Invalid email or password.";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "Player";
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Player";
}

function signUserJwt(
  jwtSecret: string,
  user: { id: string; email: string; name: string; isGuest: boolean }
): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      isGuest: user.isGuest
    },
    jwtSecret,
    { expiresIn: "7d" }
  );
}

async function ensureConfigured(reply: FastifyReply): Promise<string | null> {
  try {
    await ensurePasswordProtocolReady();
    return getPasswordServerSetup();
  } catch {
    reply.status(500);
    return null;
  }
}

export async function registerPasswordAuthRoutes(server: FastifyInstance): Promise<void> {
  server.post("/auth/password/register/start", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = passwordRegisterStartSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    const serverSetup = await ensureConfigured(reply);
    if (!serverSetup) {
      return { message: "Password authentication is not configured." };
    }

    const email = normalizeEmail(parsed.data.email);
    const now = new Date();

    let user = await prisma.user.findUnique({
      where: { email },
      include: { opaqueRecord: true }
    });

    if (user?.opaqueRecord) {
      reply.status(409);
      return { message: "Password already set for this account." };
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: nameFromEmail(email),
          isGuest: false,
          emailVerificationDueAt: new Date(now.getTime() + VERIFY_DUE_MS)
        },
        include: { opaqueRecord: true }
      });
      logger.info("POST /auth/password/register/start: created user", { userId: user.id });
    }

    try {
      const { registrationResponse } = passwordProtocol.createRegistrationResponse({
        serverSetup,
        userIdentifier: user.id,
        registrationRequest: parsed.data.registrationRequest
      });
      return { registrationResponse };
    } catch (error) {
      logger.error("POST /auth/password/register/start: failed", {
        errorName: (error as Error).name
      });
      reply.status(400);
      return { message: "Could not start password registration." };
    }
  });

  server.post("/auth/password/register/finish", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = passwordRegisterFinishSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    const serverSetup = await ensureConfigured(reply);
    if (!serverSetup) {
      return { message: "Password authentication is not configured." };
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { opaqueRecord: true }
    });

    if (!user) {
      reply.status(400);
      return { message: "Could not complete password registration." };
    }

    if (user.opaqueRecord) {
      reply.status(409);
      return { message: "Password already set for this account." };
    }

    const now = new Date();
    await prisma.opaqueRecord.create({
      data: {
        userId: user.id,
        envelope: parsed.data.registrationRecord
      }
    });

    if (!user.emailVerificationDueAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerificationDueAt: new Date(now.getTime() + VERIFY_DUE_MS) }
      });
    }

    logger.info("POST /auth/password/register/finish: password credential stored", {
      userId: user.id
    });
    return { ok: true };
  });

  server.post("/auth/password/login/start", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = passwordLoginStartSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    const serverSetup = await ensureConfigured(reply);
    if (!serverSetup) {
      return { message: "Password authentication is not configured." };
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { opaqueRecord: true }
    });

    const userIdentifier = user?.id ?? email;
    const registrationRecord = user?.opaqueRecord?.envelope ?? null;

    try {
      const { loginResponse, serverLoginState } = passwordProtocol.startLogin({
        serverSetup,
        userIdentifier,
        registrationRecord,
        startLoginRequest: parsed.data.startLoginRequest
      });

      const loginId = storePasswordLoginAttempt({
        serverLoginState,
        userId: user?.opaqueRecord ? user.id : null
      });

      return { loginResponse, loginId };
    } catch (error) {
      logger.error("POST /auth/password/login/start: failed", {
        errorName: (error as Error).name
      });
      reply.status(400);
      return { message: "Could not start password login." };
    }
  });

  server.post("/auth/password/login/finish", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = passwordLoginFinishSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return { errors: parsed.error.flatten() };
    }

    const serverSetup = await ensureConfigured(reply);
    if (!serverSetup) {
      return { message: "Password authentication is not configured." };
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      reply.status(500);
      logger.error("POST /auth/password/login/finish: JWT_SECRET missing");
      return { message: "Authentication is not configured." };
    }

    const attempt = takePasswordLoginAttempt(parsed.data.loginId);
    if (!attempt || !attempt.userId) {
      reply.status(401);
      return { message: GENERIC_LOGIN_FAILURE };
    }

    try {
      passwordProtocol.finishLogin({
        serverLoginState: attempt.serverLoginState,
        finishLoginRequest: parsed.data.finishLoginRequest
      });
    } catch {
      reply.status(401);
      return { message: GENERIC_LOGIN_FAILURE };
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findUnique({ where: { id: attempt.userId } });
    if (!user || normalizeEmail(user.email) !== email) {
      reply.status(401);
      return { message: GENERIC_LOGIN_FAILURE };
    }

    const token = signUserJwt(jwtSecret, user);
    logger.info("POST /auth/password/login/finish: signed in", { userId: user.id });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? undefined,
        isGuest: user.isGuest
      }
    };
  });
}

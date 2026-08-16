import jwt from "jsonwebtoken";

import type { AuthUser } from "../../../lib/authTypes.js";
import type { AuthTokenIssuer } from "../application/ports.js";
import { toAuthUser, type AuthTokenSource } from "../domain/authUser.js";

export function signAuthToken(user: AuthTokenSource): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  const authUser = toAuthUser(user);
  return jwt.sign(
    {
      sub: authUser.id,
      email: authUser.email,
      name: authUser.name,
      isGuest: Boolean(authUser.isGuest),
      emailVerified: Boolean(authUser.emailVerified),
      ...(authUser.verifyBy != null ? { verifyBy: authUser.verifyBy } : {})
    },
    secret,
    { expiresIn: "7d" }
  );
}

/** Verifies a bearer token and projects its claims; null on any failure. */
export function verifyAuthToken(token: string): AuthUser | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return null;
  }
  try {
    const payload = jwt.verify(token, secret) as {
      sub?: string;
      email?: string;
      name?: string;
      isGuest?: boolean;
      emailVerified?: boolean;
      verifyBy?: number;
    };
    if (!payload.sub || !payload.email) {
      return null;
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      isGuest: payload.isGuest,
      emailVerified: payload.emailVerified,
      verifyBy: payload.verifyBy
    };
  } catch {
    return null;
  }
}

export class JwtTokenIssuer implements AuthTokenIssuer {
  isConfigured(): boolean {
    return Boolean(process.env.JWT_SECRET);
  }

  sign(user: AuthTokenSource): string {
    return signAuthToken(user);
  }
}

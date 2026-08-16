import type { AuthUser } from "../../../lib/authTypes.js";

export type { AuthUser };

/** Minimum profile needed to mint a JWT or render the client-facing user object. */
export type AuthTokenSource = {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
  emailVerifiedAt?: Date | null;
  emailVerificationDueAt?: Date | null;
};

export function toAuthUser(user: AuthTokenSource): AuthUser {
  const emailVerified = Boolean(user.emailVerifiedAt);
  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    isGuest: user.isGuest,
    emailVerified
  };
  if (!emailVerified && user.emailVerificationDueAt) {
    authUser.verifyBy = user.emailVerificationDueAt.getTime();
  }
  return authUser;
}

export type AuthUserView = AuthUser & { avatarUrl?: string };

export function toAuthUserView(
  user: AuthTokenSource & { avatarUrl?: string | null }
): AuthUserView {
  return { ...toAuthUser(user), avatarUrl: user.avatarUrl ?? undefined };
}

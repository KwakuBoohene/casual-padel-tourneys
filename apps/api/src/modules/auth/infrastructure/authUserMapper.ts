import type { AuthUserRecord } from "../application/ports.js";

export type AuthUserRow = {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
  avatarUrl: string | null;
  googleId: string | null;
  guestId: string | null;
  emailVerifiedAt: Date | null;
  emailVerificationDueAt: Date | null;
};

export function toAuthUserRecord(row: AuthUserRow): AuthUserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isGuest: row.isGuest,
    avatarUrl: row.avatarUrl,
    googleId: row.googleId,
    guestId: row.guestId,
    emailVerifiedAt: row.emailVerifiedAt,
    emailVerificationDueAt: row.emailVerificationDueAt
  };
}

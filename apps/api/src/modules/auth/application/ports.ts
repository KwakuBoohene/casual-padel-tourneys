import type { AuthTokenSource } from "../domain/authUser.js";
import type {
  LoginAttemptStore,
  PasswordProtocolPort,
  ResetTicketStore
} from "./passwordPorts.js";

export type MagicTokenPurpose = "LOGIN" | "VERIFY" | "RESET";

export interface AuthUserRecord extends AuthTokenSource {
  avatarUrl: string | null;
  googleId: string | null;
  guestId: string | null;
  emailVerifiedAt: Date | null;
  emailVerificationDueAt: Date | null;
}

export type NewAuthUser = {
  email: string;
  name: string;
  isGuest: boolean;
  googleId?: string;
  guestId?: string;
  avatarUrl?: string;
  emailVerifiedAt?: Date;
  emailVerificationDueAt?: Date;
};

/** Undefined fields are left untouched, matching Prisma update semantics. */
export type AuthUserPatch = {
  email?: string;
  name?: string;
  avatarUrl?: string;
  googleId?: string;
  isGuest?: boolean;
  emailVerifiedAt?: Date;
  emailVerificationDueAt?: Date;
};

export interface AuthUserRepository {
  findById(id: string): Promise<AuthUserRecord | null>;
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  findByGoogleId(googleId: string): Promise<AuthUserRecord | null>;
  findByGuestId(guestId: string): Promise<AuthUserRecord | null>;
  create(input: NewAuthUser): Promise<AuthUserRecord>;
  update(id: string, patch: AuthUserPatch): Promise<AuthUserRecord>;
  hasPasswordCredential(userId: string): Promise<boolean>;
  getPasswordEnvelope(userId: string): Promise<string | null>;
  addPasswordCredential(userId: string, envelope: string): Promise<void>;
  /** Reset flow: swap the envelope and mark the account verified in one transaction. */
  replacePasswordCredential(
    userId: string,
    envelope: string,
    verifiedAt: Date
  ): Promise<AuthUserRecord>;
}

export interface MagicTokenStore {
  /** Returns the raw token to embed in the outbound link; only its hash is persisted. */
  issue(input: {
    userId: string;
    purpose: MagicTokenPurpose;
    expiresAt: Date;
  }): Promise<string>;
  /** LOGIN/VERIFY: consumes the token, marks the account verified, returns the user. */
  consumeSignIn(rawToken: string): Promise<AuthUserRecord | null>;
  /** RESET: consumes the token and returns its owner without touching the account. */
  consumeReset(rawToken: string): Promise<{ userId: string } | null>;
}

export type AuthEmailKind = "SIGN_IN" | "VERIFY" | "ATTACH" | "PASSWORD_RESET";

export interface AuthNotifier {
  send(kind: AuthEmailKind, to: string, rawToken: string): Promise<void>;
}

export interface AuthTokenIssuer {
  isConfigured(): boolean;
  sign(user: AuthTokenSource): string;
}

export type GoogleIdentity = {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

export interface GoogleTokenVerifier {
  isConfigured(): boolean;
  /** Null when the payload is unusable; throws when verification itself fails. */
  verify(idToken: string): Promise<GoogleIdentity | null>;
}

export type AuthModuleDeps = {
  users: AuthUserRepository;
  magicTokens: MagicTokenStore;
  notifier: AuthNotifier;
  tokens: AuthTokenIssuer;
  google: GoogleTokenVerifier;
  password: PasswordProtocolPort;
  loginAttempts: LoginAttemptStore;
  resetTickets: ResetTicketStore;
};

export type { LoginAttemptStore, PasswordProtocolPort, ResetTicketStore };

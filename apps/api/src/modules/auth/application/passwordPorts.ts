/**
 * OPAQUE-facing ports. The protocol itself is untouched — `infrastructure/`
 * wraps `lib/passwordProtocol.ts` so use-cases never import the crypto library.
 */

export interface PasswordProtocolPort {
  /** Resolves once OPAQUE is loaded and a server setup is configured; throws otherwise. */
  ensureReady(): Promise<void>;
  createRegistrationResponse(input: {
    userIdentifier: string;
    registrationRequest: string;
  }): string;
  startLogin(input: {
    userIdentifier: string;
    registrationRecord: string | null;
    startLoginRequest: string;
  }): { loginResponse: string; serverLoginState: string };
  /** Throws when the client proof does not verify. */
  finishLogin(input: { serverLoginState: string; finishLoginRequest: string }): void;
}

/** Short-lived server login state, keyed by an opaque `loginId` handed to the client. */
export interface LoginAttemptStore {
  store(input: { serverLoginState: string; userId: string | null }): string;
  take(loginId: string): { serverLoginState: string; userId: string | null } | null;
}

/** Short-lived proof that a reset link was consumed, exchanged for a new password. */
export interface ResetTicketStore {
  store(userId: string): string;
  /** Register/start may retry, so it peeks instead of consuming. */
  peek(resetTicket: string): { userId: string } | null;
  take(resetTicket: string): { userId: string } | null;
}

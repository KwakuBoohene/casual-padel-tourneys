import { useCallback, useEffect, useState } from "react";

import type { AuthSession, AuthUser } from "../api/auth";
import { clearAuthSession, loadStoredAuth, persistAuthSession } from "../api/authStorage";
import { logger } from "../logger";

export function useAuthSession() {
  const [ready, setReady] = useState(false);
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [emailVerifyRequired, setEmailVerifyRequired] = useState(false);
  const [verifyBy, setVerifyBy] = useState<number | undefined>(undefined);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await loadStoredAuth();
        setAuthTokenState(stored.token);
        setCurrentUser(stored.user);
      } catch (error) {
        logger.error("useAuthSession: bootstrap failed", { error });
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const handleSignedIn = useCallback(async (session: AuthSession) => {
    setAuthTokenState(session.token);
    setCurrentUser(session.user);
    setEmailVerifyRequired(false);
    setVerifyBy(undefined);
    try {
      await persistAuthSession(session.token, session.user);
    } catch (error) {
      logger.error("useAuthSession: persist failed", { error });
    }
  }, []);

  const updateUser = useCallback(async (user: AuthUser) => {
    setCurrentUser(user);
    if (authToken) {
      try {
        await persistAuthSession(authToken, user);
      } catch (error) {
        logger.error("useAuthSession: update user failed", { error });
      }
    }
  }, [authToken]);

  const handleSignOut = useCallback(async () => {
    setAuthTokenState(null);
    setCurrentUser(null);
    setEmailVerifyRequired(false);
    setVerifyBy(undefined);
    try {
      await clearAuthSession();
    } catch (error) {
      logger.error("useAuthSession: clear failed", { error });
    }
  }, []);

  const markEmailVerifyRequired = useCallback((dueAt?: number) => {
    setEmailVerifyRequired(true);
    setVerifyBy(dueAt);
  }, []);

  const clearEmailVerifyRequired = useCallback(() => {
    setEmailVerifyRequired(false);
    setVerifyBy(undefined);
  }, []);

  return {
    ready,
    authToken,
    currentUser,
    emailVerifyRequired,
    verifyBy,
    handleSignedIn,
    handleSignOut,
    updateUser,
    markEmailVerifyRequired,
    clearEmailVerifyRequired
  };
}

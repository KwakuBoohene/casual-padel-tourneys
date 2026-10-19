import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { createContext, useCallback, useContext, type ReactNode } from "react";

import { useAuthSession } from "../hooks/useAuthSession";
import { useSessionExpiryWatcher } from "../hooks/auth/useSessionExpiryWatcher";

type AuthSessionContextValue = ReturnType<typeof useAuthSession>;

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const value = useAuthSession();
  const queryClient = useQueryClient();
  const { handleSessionExpired } = value;

  useSessionExpiryWatcher(
    useCallback(() => {
      void handleSessionExpired();
      queryClient.clear();
      // The (app) gate redirects on a cleared token, but (auth) routes such as /verify do not.
      router.replace("/sign-in");
    }, [handleSessionExpired, queryClient])
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSessionContext(): AuthSessionContextValue {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error("useAuthSessionContext must be used within AuthSessionProvider.");
  }
  return value;
}

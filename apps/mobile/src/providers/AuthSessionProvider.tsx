import { createContext, useContext, type ReactNode } from "react";

import { useAuthSession } from "../hooks/useAuthSession";

type AuthSessionContextValue = ReturnType<typeof useAuthSession>;

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const value = useAuthSession();
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSessionContext(): AuthSessionContextValue {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error("useAuthSessionContext must be used within AuthSessionProvider.");
  }
  return value;
}

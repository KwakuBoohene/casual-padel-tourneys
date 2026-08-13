import { useState } from "react";

import type { AuthSession } from "../../../api/auth";
import { loginWithPassword, registerPasswordAccount } from "../../../api/passwordFlow";
import { logger } from "../../../logger";

export type PasswordMode = "login" | "register";

export function usePasswordAuth(onSignedIn: (session: AuthSession) => void) {
  const [mode, setMode] = useState<PasswordMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setErrorMessage("Enter your email and password.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      if (mode === "register") {
        await registerPasswordAccount(normalizedEmail, password);
        const session = await loginWithPassword(normalizedEmail, password);
        onSignedIn(session);
        return;
      }
      onSignedIn(await loginWithPassword(normalizedEmail, password));
    } catch (error) {
      logger.error("usePasswordAuth: failed", { mode, error });
      setErrorMessage(error instanceof Error ? error.message : "Could not continue with password.");
    } finally {
      setLoading(false);
    }
  }

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    errorMessage,
    clearError: () => setErrorMessage(null),
    infoMessage,
    setInfoMessage,
    submit
  };
}

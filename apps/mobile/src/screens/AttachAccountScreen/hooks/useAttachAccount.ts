import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";

import {
  attachEmail,
  attachGoogle,
  type AuthSession as AuthSessionResult,
  type AuthUser
} from "../../../api/auth";
import { attachPasswordToGuest } from "../../../api/passwordAttachReset";
import { logger } from "../../../logger";

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = "padel";

export type AttachMode = "menu" | "email" | "password";

interface UseAttachAccountParams {
  onAttached: (session: AuthSessionResult) => void;
  onEmailPending: (user: AuthUser, message: string) => void;
}

export function useAttachAccount(params: UseAttachAccountParams) {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: APP_SCHEME });
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri
  });

  const [mode, setMode] = useState<AttachMode>("menu");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (response?.type !== "success" || !response.params.id_token) {
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        params.onAttached(await attachGoogle(response.params.id_token));
      } catch (error) {
        logger.error("useAttachAccount: google failed", { error });
        setErrorMessage(error instanceof Error ? error.message : "Could not attach Google.");
      } finally {
        setLoading(false);
      }
    })();
  }, [response]);

  async function submitEmail() {
    setLoading(true);
    setInfoMessage(null);
    try {
      const result = await attachEmail(email.trim().toLowerCase());
      params.onEmailPending(result.user, result.message);
      setInfoMessage(result.message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not attach email.");
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword() {
    setLoading(true);
    try {
      params.onAttached(await attachPasswordToGuest(email.trim().toLowerCase(), password));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not attach password.");
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
    googleReady: Boolean(request),
    promptGoogle: () => {
      void promptAsync();
    },
    submitEmail,
    submitPassword
  };
}

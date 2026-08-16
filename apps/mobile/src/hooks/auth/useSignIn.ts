import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";

import {
  requestMagicLink as requestMagicLinkApi,
  signInAsGuest,
  signInWithGoogle,
  type AuthSession as AuthSessionResult
} from "../../api/auth";
import { generateGuestId, getStoredGuestId, storeGuestId } from "../../api/guestId";
import { logger } from "../../logger";

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = "padel";

export type SignInView = "methods" | "magic";

interface UseSignInParams {
  onSignedIn: (session: AuthSessionResult) => void;
}

export function useSignIn(params: UseSignInParams) {
  const { onSignedIn } = params;
  const redirectUri = AuthSession.makeRedirectUri({ scheme: APP_SCHEME });
  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleWebClientId,
    androidClientId: googleAndroidClientId,
    redirectUri
  });

  const [view, setView] = useState<SignInView>("methods");
  const [guestLoading, setGuestLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSentMessage, setMagicSentMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const exchangeIdToken = useCallback(
    async (idToken: string) => {
      setGoogleLoading(true);
      try {
        onSignedIn(await signInWithGoogle(idToken));
      } catch (error) {
        logger.error("useSignIn: Google exchange failed", { error });
        setErrorMessage(error instanceof Error ? error.message : "Could not sign in with Google.");
      } finally {
        setGoogleLoading(false);
      }
    },
    [onSignedIn]
  );

  useEffect(() => {
    if (response?.type === "success" && response.params.id_token) {
      void exchangeIdToken(response.params.id_token);
    } else if (response?.type === "error") {
      setErrorMessage("Google sign-in did not complete. Please try again.");
    }
  }, [response, exchangeIdToken]);

  async function continueAsGuest() {
    setGuestLoading(true);
    try {
      let guestId = await getStoredGuestId();
      if (!guestId) {
        guestId = generateGuestId();
        await storeGuestId(guestId);
      }
      onSignedIn(await signInAsGuest(guestId));
    } catch (error) {
      logger.error("useSignIn: guest sign-in failed", { error });
      setErrorMessage(error instanceof Error ? error.message : "Could not continue as guest.");
    } finally {
      setGuestLoading(false);
    }
  }

  async function sendMagicLink(email: string) {
    setMagicLoading(true);
    setMagicSentMessage(null);
    try {
      setMagicSentMessage((await requestMagicLinkApi(email)).message);
    } catch (error) {
      logger.error("useSignIn: magic link request failed", { error });
      setErrorMessage(error instanceof Error ? error.message : "Could not send sign-in link.");
    } finally {
      setMagicLoading(false);
    }
  }

  return {
    view,
    setView,
    googleReady: Boolean(request),
    googleLoading,
    guestLoading,
    magicLoading,
    magicSentMessage,
    errorMessage,
    clearError: () => setErrorMessage(null),
    promptGoogle: () => {
      void promptAsync();
    },
    continueAsGuest,
    sendMagicLink
  };
}

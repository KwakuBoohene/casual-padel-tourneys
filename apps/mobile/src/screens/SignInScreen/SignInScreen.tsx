import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../theme";
import { logger } from "../../logger";

WebBrowser.maybeCompleteAuthSession();

/**
 * Must match "scheme" in app.json.
 * Using a custom scheme makes the redirect URI e.g. padel:// (dev build), which Google OAuth allows.
 * Add the exact redirect URI in Google Cloud Console: APIs & Services → Credentials → your OAuth client → Authorized redirect URIs.
 */
const APP_SCHEME = "padel";
const GUEST_ID_KEY = "guestId";

interface SignInScreenProps {
  onSignedIn: (params: { token: string; user: { id: string; name?: string; email: string; avatarUrl?: string; isGuest?: boolean } }) => void;
}

function generateGuestId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getStoredGuestId(): Promise<string | null> {
  if (Platform.OS === "web") {
    const anyGlobal = globalThis as typeof globalThis & {
      localStorage?: { getItem(key: string): string | null };
    };
    if (typeof anyGlobal !== "undefined" && anyGlobal.localStorage) {
      return anyGlobal.localStorage.getItem(GUEST_ID_KEY);
    }
    return null;
  }

  return SecureStore.getItemAsync(GUEST_ID_KEY);
}

async function storeGuestId(guestId: string): Promise<void> {
  if (Platform.OS === "web") {
    const anyGlobal = globalThis as typeof globalThis & {
      localStorage?: { setItem(key: string, value: string): void };
    };
    if (typeof anyGlobal !== "undefined" && anyGlobal.localStorage) {
      anyGlobal.localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return;
  }

  await SecureStore.setItemAsync(GUEST_ID_KEY, guestId);
}

export function SignInScreen(props: SignInScreenProps) {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: APP_SCHEME });
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleWebClientId,
    androidClientId: googleAndroidClientId,
    redirectUri
  });
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    logger.debug("SignInScreen: auth request initialised", {
      hasRequest: Boolean(request),
      redirectUri: request?.redirectUri,
      hasGoogleWebClientId: Boolean(googleWebClientId),
      hasGoogleAndroidClientId: Boolean(googleAndroidClientId)
    });
  }, [googleAndroidClientId, googleWebClientId, request]);

  useEffect(() => {
    if (response?.type === "success" && response.params.id_token) {
      logger.info("SignInScreen: received Google id_token");
      void exchangeIdToken(response.params.id_token);
    } else if (response?.type && response.type !== "success") {
      logger.warn("SignInScreen: Google response not successful", { type: response.type });
    }
  }, [response]);

  async function exchangeIdToken(idToken: string) {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    logger.debug("SignInScreen: exchanging idToken with API", { apiBaseUrl });
    try {
      const result = await fetch(`${apiBaseUrl}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idToken })
      });
      if (!result.ok) {
        logger.error("SignInScreen: /auth/google failed", { status: result.status });
        return;
      }
      const json = (await result.json()) as {
        token: string;
        user: { id: string; name?: string; email: string; avatarUrl?: string; isGuest?: boolean };
      };
      logger.info("SignInScreen: exchange succeeded", { userId: json.user.id });
      props.onSignedIn(json);
    } catch (error) {
      logger.error("SignInScreen: network error during idToken exchange", { error });
    }
  }

  async function continueAsGuest() {
    setGuestLoading(true);
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    try {
      let guestId = await getStoredGuestId();
      if (!guestId) {
        guestId = generateGuestId();
        await storeGuestId(guestId);
      }
      logger.debug("SignInScreen: continuing as guest", { guestId });

      const result = await fetch(`${apiBaseUrl}/auth/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId })
      });
      if (!result.ok) {
        logger.error("SignInScreen: /auth/guest failed", { status: result.status });
        return;
      }
      const json = (await result.json()) as {
        token: string;
        user: { id: string; name?: string; email: string; isGuest: boolean };
      };
      logger.info("SignInScreen: guest sign-in succeeded", { userId: json.user.id });
      props.onSignedIn(json);
    } catch (error) {
      logger.error("SignInScreen: network error during guest sign-in", { error });
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.lg,
        gap: spacing.lg
      }}
    >
      <View style={{ alignItems: "center", gap: spacing.sm }}>
        <Text style={[typography.title, { color: colors.text }]}>Casual Padel Tourneys</Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>Sign in to manage your tournaments.</Text>
      </View>
      <Pressable
        disabled={!request}
        onPress={() => {
          void promptAsync();
        }}
        style={{
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
          backgroundColor: request ? colors.primary : colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm
        }}
      >
        {!request ? <ActivityIndicator color="#020617" /> : null}
        <Text
          style={{
            color: "#020617",
            fontWeight: "700"
          }}
        >
          Continue with Google
        </Text>
      </Pressable>
      <Pressable
        disabled={guestLoading}
        onPress={() => { void continueAsGuest(); }}
        style={{
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm
        }}
      >
        {guestLoading ? <ActivityIndicator color={colors.text} /> : null}
        <Text style={{ color: colors.text, fontWeight: "600" }}>Continue as Guest</Text>
      </Pressable>
    </View>
  );
}


import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../theme";
import { logger } from "../../logger";

WebBrowser.maybeCompleteAuthSession();

/**
 * Must match "scheme" in app.json.
 * Using a custom scheme makes the redirect URI e.g. padel:// (dev build), which Google OAuth allows.
 * Add the exact redirect URI in Google Cloud Console: APIs & Services → Credentials → your OAuth client → Authorized redirect URIs.
 */
const APP_SCHEME = "padel";

interface SignInScreenProps {
  onSignedIn: (params: { token: string; user: { id: string; name?: string; email: string; avatarUrl?: string } }) => void;
}

export function SignInScreen(props: SignInScreenProps) {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: APP_SCHEME });
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri
  });

  useEffect(() => {
    logger.debug("SignInScreen: auth request initialised", {
      hasRequest: Boolean(request),
      redirectUri: request?.redirectUri
    });
  }, [request]);

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
        user: { id: string; name?: string; email: string; avatarUrl?: string };
      };
      logger.info("SignInScreen: exchange succeeded", { userId: json.user.id });
      props.onSignedIn(json);
    } catch (error) {
      logger.error("SignInScreen: network error during idToken exchange", { error });
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
        <Text style={[typography.title, { color: colors.text }]}>Padel Organizer</Text>
        <Text style={{ color: colors.muted, fontSize: 14 }}>Sign in with Google to manage your tournaments.</Text>
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
    </View>
  );
}


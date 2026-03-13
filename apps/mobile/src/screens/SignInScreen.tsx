import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../theme";

WebBrowser.maybeCompleteAuthSession();

interface SignInScreenProps {
  onSignedIn: (params: { token: string; user: { id: string; name?: string; email: string; avatarUrl?: string } }) => void;
}

export function SignInScreen(props: SignInScreenProps) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
  });

  useEffect(() => {
    if (response?.type === "success" && response.params.id_token) {
      void exchangeIdToken(response.params.id_token);
    }
  }, [response]);

  async function exchangeIdToken(idToken: string) {
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
    const result = await fetch(`${apiBaseUrl}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ idToken })
    });
    if (!result.ok) {
      // Minimal error handling; OrganizerScreen will display errors if needed.
      return;
    }
    const json = (await result.json()) as {
      token: string;
      user: { id: string; name?: string; email: string; avatarUrl?: string };
    };
    props.onSignedIn(json);
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


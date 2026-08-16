import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect, Stack, router, useLocalSearchParams } from "expo-router";

import { PageShell } from "../../../../src/layout";
import { useOrganizerSession } from "../../../../src/providers/OrganizerSessionProvider";
import { useTheme } from "../../../../src/theme/ThemeProvider";
import { spacing } from "../../../../src/theme";
import { tournamentLeaderboardPath } from "../../../../src/utilities/organizer/tournamentRoutes";

function parseEditFlag(edit: string | string[] | undefined): boolean {
  const raw = Array.isArray(edit) ? edit[0] : edit;
  return raw === "1" || raw === "true";
}

function TournamentLoadGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const org = useOrganizerSession();
  const params = useLocalSearchParams<{ id: string; edit?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const editMode = parseEditFlag(params.edit);
  const [status, setStatus] = useState<"loading" | "ready" | "leaderboard" | "koh" | "error">("loading");
  const [message, setMessage] = useState("");
  const loadGen = useRef(0);

  useEffect(() => {
    if (!id) {
      setStatus("error");
      setMessage("Missing tournament id.");
      return;
    }

    if (org.liveTournament?.id === id) {
      setStatus("ready");
      return;
    }

    if (org.kohHub?.id === id) {
      setStatus("koh");
      return;
    }

    const gen = ++loadGen.current;
    setStatus("loading");
    setMessage("");

    void (async () => {
      const result = await org.openTournament(id, editMode);
      if (gen !== loadGen.current) return;
      if (result === "koh") {
        setStatus("koh");
        return;
      }
      if (result === "leaderboard") {
        setStatus("leaderboard");
        return;
      }
      if (result === "live" && org.liveTournament?.id === id) {
        setStatus("ready");
        return;
      }
      // State may not have flushed; trust result when open succeeded.
      if (result === "live") {
        setStatus("ready");
        return;
      }
      setStatus("error");
      setMessage(org.errorText || "Could not open this tournament.");
    })();
  }, [id, editMode]);

  if (!id) {
    return <Redirect href="/tournaments" />;
  }

  if (status === "koh") {
    return <Redirect href="/flow" />;
  }

  if (status === "leaderboard") {
    return <Redirect href={tournamentLeaderboardPath(id)} />;
  }

  if (status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (status === "error") {
    return (
      <PageShell>
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: "center", gap: spacing.md }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: colors.text }}>{message || "Tournament unavailable"}</Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>
            Check that you still have access, or go back to your tournament list.
          </Text>
          <Pressable
            onPress={() => {
              org.setLiveTournament(null);
              router.replace("/tournaments");
            }}
            style={{
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingHorizontal: spacing.lg
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.onPrimary }}>Back to list</Text>
          </Pressable>
        </View>
      </PageShell>
    );
  }

  if (status === "ready" && org.liveTournament?.id !== id) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function TournamentIdLayout() {
  return (
    <TournamentLoadGate>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
    </TournamentLoadGate>
  );
}

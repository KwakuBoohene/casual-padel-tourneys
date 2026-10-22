import { useEffect, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { acceptOrganizerInvitation, previewOrganizerInvitation } from "../../src/api/organizerAccess";
import {
  clearPendingOrganizerInvite,
  loadPendingOrganizerInvite,
  parseOrganizerInviteUrl,
  savePendingOrganizerInvite
} from "../../src/api/pendingOrganizerInvite";
import { useAuthSessionContext } from "../../src/providers/AuthSessionProvider";
import { useOrganizerAccount } from "../../src/providers/OrganizerAccountProvider";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AccessButton } from "../../src/components/organizerAccess/AccessButton";

export default function AcceptOrganizerInvitation() {
  const auth = useAuthSessionContext();
  const account = useOrganizerAccount();
  const { colors } = useTheme();
  const url = Linking.useURL();
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    organizerName: string;
    invitedEmail: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const incoming = parseOrganizerInviteUrl(Platform.OS === "web" ? window.location.href : url);
      if (incoming) await savePendingOrganizerInvite(incoming);
      if (Platform.OS === "web") {
        window.history.replaceState(null, "", window.location.pathname);
        const meta = document.createElement("meta");
        meta.name = "referrer";
        meta.content = "no-referrer";
        document.head.appendChild(meta);
      }
      const value = incoming ?? (await loadPendingOrganizerInvite());
      if (cancelled) return;
      if (!value) {
        setError("This invitation is missing or expired. Ask the owner to send a new invitation.");
        return;
      }
      setToken(value);
      try {
        const response = await previewOrganizerInvitation(value);
        if (!cancelled) {
          setPreview(response.data);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);
  const accept = async () => {
    if (!token || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await acceptOrganizerInvitation(token);
      await account.activate(response.data.organizerId);
      await clearPendingOrganizerInvite();
      router.replace("/tournaments");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: colors.background
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 520,
          padding: 24,
          borderRadius: 24,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 20
        }}
      >
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
          Organizer invitation
        </Text>
        {preview ? (
          <>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
              {preview.organizerName} invited you as a Manager
            </Text>
            <Text style={{ color: colors.muted }}>
              You can create and manage their tournaments, scores, players, leaderboard and exports. They
              remain the owner and can remove access.
            </Text>
            <Text style={{ color: colors.muted }}>
              For {preview.invitedEmail} · Expires {new Date(preview.expiresAt).toLocaleDateString()}
            </Text>
            {auth.currentUser && auth.authToken ? (
              <>
                <Text style={{ color: colors.text }}>Signed in as {auth.currentUser.email}</Text>
                <AccessButton
                  label="Accept invitation"
                  disabled={
                    busy || !account.ready || auth.currentUser.isGuest || !auth.currentUser.emailVerified
                  }
                  onPress={() => void accept()}
                />
                {auth.currentUser.isGuest ? (
                  <AccessButton
                    label="Attach and verify account"
                    secondary
                    onPress={() => router.push("/profile/attach")}
                  />
                ) : !auth.currentUser.emailVerified ? (
                  <AccessButton label="Verify email" secondary onPress={() => router.push("/verify")} />
                ) : null}
                <AccessButton
                  label="Switch account"
                  secondary
                  disabled={busy}
                  onPress={() => void auth.handleSignOut().then(() => router.replace("/sign-in"))}
                />
              </>
            ) : (
              <AccessButton
                label="Sign in or create account"
                disabled={busy}
                onPress={() => router.push("/sign-in")}
              />
            )}
          </>
        ) : !error ? (
          <Text style={{ color: colors.muted }}>Loading invitation…</Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </Text>
        ) : null}
        <AccessButton
          label="Back"
          secondary
          disabled={busy}
          onPress={() => router.replace(auth.authToken ? "/tournaments" : "/sign-in")}
        />
      </View>
    </ScrollView>
  );
}

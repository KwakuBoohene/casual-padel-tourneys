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
import { useEmailVerificationRefresh } from "../../src/hooks/auth/useEmailVerificationRefresh";
import { radius, spacing } from "../../src/theme";

export default function AcceptOrganizerInvitation() {
  useEmailVerificationRefresh();
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
        justifyContent: "flex-start",
        alignItems: "center",
        padding: spacing.lg,
        paddingTop: 40,
        backgroundColor: colors.background
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 520,
          gap: spacing.lg
        }}
      >
        {preview ? (
          <>
            <View style={{ alignSelf: "flex-start", borderRadius: radius.pill, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Text style={{ color: auth.currentUser?.emailVerified ? colors.connected : colors.statusNext, fontSize: 12, fontWeight: "700" }}>
                ●  {auth.currentUser?.emailVerified ? "Email verified" : "Invitation saved"}
              </Text>
            </View>
            <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
              {auth.currentUser?.emailVerified ? "You’re ready to join" : auth.currentUser ? "Verify your email to continue" : "Organizer invitation"}
            </Text>
            <Text style={{ color: colors.muted }}>
              {auth.currentUser?.emailVerified
                ? "Review your manager access before accepting."
                : auth.currentUser
                  ? "We’ll keep your manager invitation ready while you verify."
                  : `${preview.organizerName} invited you as a Manager.`}
            </Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: 5, borderLeftWidth: 4, borderLeftColor: colors.primary }}>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 16 }}>{preview.organizerName} · Manager</Text>
              <Text style={{ color: colors.muted }}>Invited for {preview.invitedEmail} · Expires {new Date(preview.expiresAt).toLocaleDateString()}</Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>YOU CAN</Text>
            <Text style={{ color: colors.text, lineHeight: 23 }}>✓  Create and edit tournaments{"\n"}✓  Update scores, players and leaderboards{"\n"}✓  Share results and export data</Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: 5, borderLeftWidth: 4, borderLeftColor: colors.statusNext }}>
              <Text style={{ color: colors.statusNext, fontWeight: "700" }}>Owner remains in control</Text>
              <Text style={{ color: colors.muted }}>Only the owner can remove access or permanently delete tournaments.</Text>
            </View>
            {auth.currentUser && auth.authToken ? (
              <>
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
                  <AccessButton label="Verify email" onPress={() => router.push("/verify")} />
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
        <AccessButton label="Not now" secondary disabled={busy} onPress={() => router.replace(auth.authToken ? "/tournaments" : "/sign-in")} />
      </View>
    </ScrollView>
  );
}

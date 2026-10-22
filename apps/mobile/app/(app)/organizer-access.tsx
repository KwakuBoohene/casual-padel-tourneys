import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import type { OrganizerAccessOverview } from "@padel/shared";
import {
  fetchOrganizerAccess,
  inviteOrganizerManager,
  resendOrganizerInvitation,
  revokeOrganizerInvitation,
  removeOrganizerManager
} from "../../src/api/organizerAccess";
import { useOrganizerAccount } from "../../src/providers/OrganizerAccountProvider";
import { useAuthSessionContext } from "../../src/providers/AuthSessionProvider";
import { useTheme } from "../../src/theme/ThemeProvider";
import { AccessButton } from "../../src/components/organizerAccess/AccessButton";
import { AccessConfirm } from "../../src/components/organizerAccess/AccessConfirm";
import { ActivityPanel } from "../../src/components/organizerAccess/ActivityPanel";
import { PageShell, useBreakpoint } from "../../src/layout";
import { useEmailVerificationRefresh } from "../../src/hooks/auth/useEmailVerificationRefresh";

export default function OrganizerAccessScreen() {
  useEmailVerificationRefresh();
  const account = useOrganizerAccount();
  const auth = useAuthSessionContext();
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const [overview, setOverview] = useState<OrganizerAccessOverview | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    run: () => Promise<unknown>;
  } | null>(null);
  const selected = account.selected;
  const owner = selected?.role === "OWNER";
  const load = useCallback(async () => {
    if (!account.selected || auth.currentUser?.isGuest) return;
    try {
      setOverview((await fetchOrganizerAccess(account.selected.id)).data);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [account.selected, auth.currentUser?.isGuest]);
  const { refresh } = account;
  useEffect(() => {
    void load();
    void refresh().catch(() => {});
  }, [load, refresh]);
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setConfirm(null);
      await load();
      await account.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!selected) {
    return (
      <PageShell>
        <ActivityIndicator accessibilityLabel="Loading organizer access" color={colors.primary} />
      </PageShell>
    );
  }
  return (
    <PageShell>
      <ScrollView
        contentContainerStyle={{
          width: "100%",
          maxWidth: 1200,
          alignSelf: "center",
          gap: 20,
          padding: isWide ? 36 : 20,
          paddingBottom: 60
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}
        >
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: isWide ? 34 : 26, fontWeight: "800" }}>
            Organizer settings
          </Text>
          <AccessButton
            label="Back to tournaments"
            secondary
            onPress={() => router.replace("/tournaments")}
          />
        </View>
        <Text style={{ color: colors.muted }}>
          {isWide ? "Manage verification and everyone who can work in this organizer workspace." : `Signed in as ${auth.currentUser?.name} (${auth.currentUser?.email}). Each person keeps their own login.`}
        </Text>
        <View style={{ flexDirection: isWide ? "row" : "column", alignItems: "flex-start", gap: 24 }}>
          {isWide ? (
            <View style={{ width: 220, minHeight: 390, padding: 16, borderRadius: 16, backgroundColor: colors.surface, gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", marginBottom: 8 }}>SETTINGS</Text>
              {['Profile', 'Email & security', 'Organizer access', 'Activity'].map((label) => (
                <View key={label} style={{ minHeight: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: label === 'Organizer access' ? colors.surfaceAlt : "transparent" }}>
                  <Text style={{ color: label === 'Organizer access' ? colors.primary : colors.muted, fontWeight: label === 'Organizer access' ? "700" : "500" }}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ flex: 1, width: "100%", gap: 20 }}>
        <View style={{ padding: 16, borderRadius: 16, backgroundColor: colors.surface, gap: 8, flexDirection: isWide ? "row" : "column", alignItems: isWide ? "center" : "flex-start", justifyContent: "space-between" }}>
          <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surfaceAlt }}>
            <Text style={{ color: auth.currentUser?.emailVerified ? colors.connected : colors.statusNext, fontWeight: "700", fontSize: 12 }}>
              ●  Email {auth.currentUser?.emailVerified ? "verified" : "verification required"}
            </Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: "600" }}>{auth.currentUser?.email}</Text>
          {isWide ? <Text style={{ color: colors.muted, fontSize: 12 }}>{auth.currentUser?.emailVerified ? "Invitations are enabled" : "Verify email to enable invitations"}</Text> : null}
        </View>
        <View style={{ padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 16, gap: 6, backgroundColor: colors.surface }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>CURRENT WORKSPACE</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            {owner ? "My organizer workspace" : selected.name}
          </Text>
          <Text style={{ color: colors.muted }}>
            {owner ? "You are the owner." : "You have Manager access. The owner keeps control of membership and permanent deletion."}
          </Text>
        </View>
        {auth.currentUser?.isGuest ? (
          <Text style={{ color: colors.muted }}>
            Attach and verify an account from Profile to invite or become a manager.
          </Text>
        ) : (
          <>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
              {owner ? "People with access" : "Your manager access"}
            </Text>
            <Text style={{ color: colors.muted }}>
              Managers can create and manage all existing and future tournaments, scores, players, career
              credit, sharing and exports. The owner controls access and permanent tournament deletion.
            </Text>
            {owner && !auth.currentUser?.emailVerified ? (
              <AccessButton
                label="Verify email to invite managers"
                secondary
                onPress={() => router.push("/verify")}
              />
            ) : null}
            {owner && account.enabled ? (
              <View style={{ gap: 12, flexDirection: isWide ? "row" : "column", alignItems: isWide ? "center" : "stretch" }}>
                <TextInput
                  accessibilityLabel="Manager email"
                  placeholder="Manager email"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  style={{
                    color: colors.text,
                    minHeight: 48,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 14,
                    backgroundColor: colors.surface,
                    flex: isWide ? 1 : undefined
                  }}
                />
                <AccessButton
                  label="Invite manager"
                  disabled={busy || !email.trim() || !auth.currentUser?.emailVerified}
                  onPress={() =>
                    setConfirm({
                      title: "Invite manager?",
                      description: `Invite ${email.trim()} to manage all your organizer tournaments and leaderboard? They must sign in and accept.`,
                      run: async () => {
                        const response = await inviteOrganizerManager(selected.id, email.trim());
                        setEmail("");
                        setMessage(
                          response.data.deliveryStatus === "SENT"
                            ? "Invitation sent. The recipient can sign in and accept from their email."
                            : "Invitation saved, but email delivery failed. Use Resend to try again."
                        );
                      }
                    })
                  }
                />
              </View>
            ) : owner ? (
              <Text style={{ color: colors.muted }}>
                Shared organizer invitations are not enabled on this server yet. Existing access can still be
                removed.
              </Text>
            ) : null}
            {overview?.members.map((member) => (
              <View
                key={member.id}
                style={{ padding: 16, borderRadius: 16, gap: 10, backgroundColor: colors.surface }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>{member.name} · Manager</Text>
                <Text style={{ color: colors.muted }}>{member.email}</Text>
                <AccessButton
                  label={owner ? `Remove ${member.name}` : "Leave organizer account"}
                  secondary
                  disabled={busy}
                  onPress={() =>
                    setConfirm({
                      title: owner ? "Remove manager?" : "Leave organizer account?",
                      description:
                        "Private access will end. Existing tournaments, results and personal accounts will remain intact.",
                      run: () => removeOrganizerManager(selected.id, member.id)
                    })
                  }
                />
              </View>
            ))}
            {overview?.invitations.map((invite) => (
              <View
                key={invite.id}
                style={{ padding: 16, gap: 10, borderRadius: 16, backgroundColor: colors.surfaceAlt }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>{invite.email}</Text>
                <Text style={{ color: colors.muted }}>
                  Pending · {invite.deliveryStatus === "FAILED" ? "Delivery failed" : "Email sent"} · Expires{" "}
                  {new Date(invite.expiresAt).toLocaleDateString()}
                </Text>
                <AccessButton
                  label={`Resend invitation to ${invite.email}`}
                  secondary
                  disabled={busy}
                  onPress={() => void run(() => resendOrganizerInvitation(selected.id, invite.id))}
                />
                <AccessButton
                  label={`Revoke invitation to ${invite.email}`}
                  secondary
                  disabled={busy}
                  onPress={() =>
                    setConfirm({
                      title: "Revoke invitation?",
                      description: "This invitation will no longer work.",
                      run: () => revokeOrganizerInvitation(selected.id, invite.id)
                    })
                  }
                />
              </View>
            ))}
            <ActivityPanel
              key={`${selected.id}:${overview?.invitations.length}:${overview?.members.length}`}
              organizerId={selected.id}
            />
          </>
        )}
          </View>
        </View>
        {message ? (
          <Text accessibilityRole="alert" style={{ color: colors.primary }}>
            {message}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </Text>
        ) : null}
        {confirm ? (
          <AccessConfirm
            title={confirm.title}
            description={confirm.description}
            busy={busy}
            onCancel={() => setConfirm(null)}
            onConfirm={() => void run(confirm.run)}
          />
        ) : null}
      </ScrollView>
    </PageShell>
  );
}

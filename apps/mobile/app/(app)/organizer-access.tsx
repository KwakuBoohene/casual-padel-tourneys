import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
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
import { PageShell } from "../../src/layout";

export default function OrganizerAccessScreen() {
  const account = useOrganizerAccount();
  const auth = useAuthSessionContext();
  const { colors } = useTheme();
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
  const selected = account.selected!;
  const owner = selected.role === "OWNER";
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
  return (
    <PageShell>
      <ScrollView
        contentContainerStyle={{
          width: "100%",
          maxWidth: 680,
          alignSelf: "center",
          gap: 24,
          padding: 20,
          paddingBottom: 60
        }}
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}
        >
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 26, fontWeight: "800" }}>
            Organizer access
          </Text>
          <AccessButton
            label="Back to tournaments"
            secondary
            onPress={() => router.replace("/tournaments")}
          />
        </View>
        <Text style={{ color: colors.muted }}>
          Signed in as {auth.currentUser?.name} ({auth.currentUser?.email}). Each person keeps their own
          login.
        </Text>
        <View style={{ gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>Organizer accounts</Text>
          {account.accounts.map((entry) => (
            <View
              key={entry.id}
              style={{
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                gap: 10,
                backgroundColor: colors.surface
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {entry.id === auth.currentUser?.id
                  ? "My organizer account"
                  : `${entry.name}'s organizer account`}{" "}
                · {entry.role === "OWNER" ? "Owner" : "Manager"}
              </Text>
              <AccessButton
                label={entry.id === selected.id ? "Currently selected" : `Manage ${entry.name}'s account`}
                secondary
                disabled={entry.id === selected.id || busy}
                onPress={() => account.select(entry)}
              />
            </View>
          ))}
        </View>
        {auth.currentUser?.isGuest ? (
          <Text style={{ color: colors.muted }}>
            Attach and verify an account from Profile to invite or become a manager.
          </Text>
        ) : (
          <>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
              {owner ? "Managers and invitations" : "Your manager access"}
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
              <View style={{ gap: 12 }}>
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
                    backgroundColor: colors.surface
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
                style={{ padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 16, gap: 10 }}
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
                style={{ padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 16 }}
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

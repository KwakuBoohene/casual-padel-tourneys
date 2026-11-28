import { ScrollView, Text, View } from "react-native";

import { AccessButton } from "../../components/organizerAccess/AccessButton";
import { useDraftInvite } from "../../hooks/organizer/drafts/useDraftInvite";
import { useBreakpoint } from "../../layout";
import { radius, spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

import { DraftInviteCard } from "./components/DraftInviteCard";

export interface DraftInviteScreenProps {
  viewer: { signedIn: boolean; isGuest: boolean; emailVerified: boolean };
  onAccepted: (draftId: string) => void;
  onDeclined: () => void;
  onSignIn: () => void;
  onAttachAccount: () => void;
  onVerifyEmail: () => void;
  onSwitchAccount: () => void;
  onNotNow: () => void;
}

/** Co-organizer invitation (Figma 06 · `3:204`). */
export function DraftInviteScreen(props: DraftInviteScreenProps) {
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const invite = useDraftInvite({ onAccepted: props.onAccepted, onDeclined: props.onDeclined });
  const { preview, problem, busy, viewer } = { ...invite, viewer: props.viewer };
  const canAccept = viewer.signedIn && !viewer.isGuest && viewer.emailVerified;
  const accepted = preview?.status === "ACCEPTED";

  const title = !preview
    ? "Co-organizer invitation"
    : accepted
      ? "You already have access"
      : canAccept
        ? `Join ${preview.draftName || "this draft"}`
        : viewer.signedIn
          ? "Finish setting up your account"
          : `${preview.invitedByName} invited you to co-organize`;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        padding: spacing.lg,
        paddingTop: isWide ? 74 : 40,
        backgroundColor: colors.background
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: isWide ? 580 : 520,
          gap: spacing.lg,
          padding: isWide ? spacing.xl : 0,
          borderRadius: isWide ? radius.lg : 0,
          backgroundColor: isWide ? colors.surface : "transparent"
        }}
      >
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
          {title}
        </Text>
        {!preview && !problem ? <Text style={{ color: colors.muted }}>Loading invitation…</Text> : null}
        {preview ? <DraftInviteCard preview={preview} /> : null}
        {problem ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {problem.message}
          </Text>
        ) : null}

        {preview && canAccept ? (
          <>
            <AccessButton
              label={busy === "accept" ? "Opening…" : accepted ? "Open draft" : "Accept & open draft"}
              disabled={Boolean(busy)}
              onPress={invite.accept}
            />
            {!accepted ? (
              <AccessButton label={busy === "decline" ? "Declining…" : "Decline"} secondary disabled={Boolean(busy)} onPress={invite.decline} />
            ) : null}
          </>
        ) : null}
        {preview && !viewer.signedIn ? <AccessButton label="Sign in or create account" onPress={props.onSignIn} /> : null}
        {preview && viewer.signedIn && viewer.isGuest ? (
          <AccessButton label="Attach and verify account" onPress={props.onAttachAccount} />
        ) : null}
        {preview && viewer.signedIn && !viewer.isGuest && !viewer.emailVerified ? (
          <AccessButton label="Verify email" onPress={props.onVerifyEmail} />
        ) : null}
        {viewer.signedIn && (problem?.kind === "mismatch" || preview) ? (
          <AccessButton label="Sign out and switch account" secondary disabled={Boolean(busy)} onPress={props.onSwitchAccount} />
        ) : null}
        <AccessButton
          label="Not now"
          secondary
          disabled={Boolean(busy)}
          onPress={() => {
            invite.dismiss();
            props.onNotNow();
          }}
        />
      </View>
    </ScrollView>
  );
}

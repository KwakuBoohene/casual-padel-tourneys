import { Text, View } from "react-native";
import type { DraftInvitationPreview } from "@padel/shared";

import { radius, spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { formatTournamentMode } from "../../../utilities/organizer/formatLabels";

/** What you're being invited to, and what a co-organizer can and can't do (Figma 06). */
export function DraftInviteCard({ preview }: { preview: DraftInvitationPreview }) {
  const { colors } = useTheme();
  const players = `${preview.playerCount} ${preview.playerCount === 1 ? "player" : "players"}`;
  return (
    <View style={{ gap: spacing.md }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          gap: 5,
          borderLeftWidth: 4,
          borderLeftColor: colors.primary
        }}
      >
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 16 }}>{preview.draftName || "Untitled draft"}</Text>
        <Text style={{ color: colors.muted }}>
          {formatTournamentMode(preview.mode)} · {players} · owner {preview.ownerName}
        </Text>
        <Text style={{ color: colors.muted }}>
          Invited for {preview.invitedEmail} · Expires {new Date(preview.expiresAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>AS A CO-ORGANIZER YOU CAN</Text>
      <Text style={{ color: colors.text, lineHeight: 23 }}>
        ✓ Edit the setup, players and match settings{"\n"}✓ Invite other co-organizers{"\n"}✓ Start the tournament when
        it&apos;s ready
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13 }}>Only {preview.ownerName} can delete this draft.</Text>
    </View>
  );
}

import { Pressable, Text, View } from "react-native";
import type { TournamentDraftSummary } from "@padel/shared";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { draftFooterLabel, draftMetaLabel } from "../../../utilities/organizer/draftListLabels";

import { DraftCollaboratorAvatars } from "./DraftCollaboratorAvatars";

interface DraftListCardProps {
  draft: TournamentDraftSummary;
  onOpen: () => void;
  onOpenOptions: () => void;
}

/** Draft row in the tournament list (Figma 01 · `3:5`). */
export function DraftListCard({ draft, onOpen, onOpenOptions }: DraftListCardProps) {
  const { colors } = useTheme();
  const shared = draft.role === "EDITOR";
  const badgeColor = shared ? colors.connected : colors.statusNext;
  const name = draft.name.trim() || "Untitled draft";
  const readiness = draft.readiness.ready ? "Ready to start" : draft.readiness.blockingReason;

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onOpenOptions}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${shared ? "shared draft" : "draft"}, ${draftMetaLabel(draft)}`}
      accessibilityHint="Long press for options"
      style={{
        minHeight: touch.minSecondary,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: 6
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.text }} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: "600", color: badgeColor }}>{shared ? "Shared" : "Draft"}</Text>
        <Pressable onPress={onOpenOptions} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Options for ${name}`}>
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>Options</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 13, color: colors.muted }}>{draftMetaLabel(draft)}</Text>
      {readiness ? (
        <Text style={{ fontSize: 12, color: draft.readiness.ready ? colors.statusCompleted : colors.statusNext }}>
          {readiness}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <Text style={{ flex: 1, fontSize: 12, color: colors.muted }} numberOfLines={1}>
          {draftFooterLabel(draft)}
        </Text>
        <DraftCollaboratorAvatars people={draft.collaborators} />
      </View>
    </Pressable>
  );
}

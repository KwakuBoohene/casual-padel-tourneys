import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import type { DraftOverviewSection } from "../../../utilities/organizer/draftOverviewSections";

interface DraftSectionRowProps {
  section: DraftOverviewSection;
  /** Undefined when this draft can't be edited in the app yet (King of the Court). */
  onPress?: () => void;
}

/** Setup / Players / Match settings row; tapping opens that wizard step. */
export function DraftSectionRow({ section, onPress }: DraftSectionRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${section.title}: ${section.value}`}
      accessibilityHint={onPress ? "Opens this step to edit" : undefined}
      style={{
        minHeight: touch.minSecondary,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{section.title}</Text>
        <Text style={{ fontSize: 13, color: section.missing ? colors.statusNext : colors.muted }} numberOfLines={2}>
          {section.value}
        </Text>
      </View>
      {onPress ? <Text style={{ fontSize: 18, color: colors.muted }}>›</Text> : null}
    </Pressable>
  );
}

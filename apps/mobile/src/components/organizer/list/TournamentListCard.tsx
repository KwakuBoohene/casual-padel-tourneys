import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../../../types/organizer/tournament";
import { formatTournamentMode } from "../../../utilities/organizer/formatLabels";

interface TournamentListCardProps {
  tournament: LiveTournamentState;
  status: "LIVE" | "COMPLETED";
  onOpen: () => void;
  onOpenOptions?: () => void;
}

export function TournamentListCard(props: TournamentListCardProps) {
  const { colors } = useTheme();
  const statusLabel = props.status === "LIVE" ? "Live" : "Done";
  const subtitle = `${formatTournamentMode(props.tournament.config.mode)} · ${statusLabel}`;

  return (
    <Pressable
      onPress={props.onOpen}
      onLongPress={props.onOpenOptions}
      accessibilityRole="button"
      accessibilityLabel={`${props.tournament.config.name}, ${subtitle}`}
      accessibilityHint={props.onOpenOptions ? "Long press for options" : undefined}
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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.text }} numberOfLines={1}>
          {props.tournament.config.name}
        </Text>
        {props.onOpenOptions ? (
          <Pressable
            onPress={props.onOpenOptions}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Options for ${props.tournament.config.name}`}
          >
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>Options</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={{ fontSize: 13, color: colors.muted }}>{subtitle}</Text>
    </Pressable>
  );
}

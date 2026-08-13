import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../types";
import { formatTournamentModeVariant } from "../formatLabels";

interface TournamentListCardProps {
  tournament: LiveTournamentState;
  status: "LIVE" | "COMPLETED";
  wideCardStyle?: object;
  onOpen: () => void;
  onOpenOptions?: () => void;
}

export function TournamentListCard(props: TournamentListCardProps) {
  const { colors, cardStyles } = useTheme();
  const isLive = props.status === "LIVE";

  return (
    <Pressable
      onPress={props.onOpen}
      style={[
        cardStyles.container,
        {
          marginTop: spacing.sm,
          backgroundColor: isLive ? colors.surfaceAlt : colors.surface,
          minHeight: touch.minSecondary
        },
        props.wideCardStyle
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing.sm
        }}
      >
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }} numberOfLines={1}>
            {props.tournament.config.name}
          </Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {formatTournamentModeVariant(props.tournament.config.mode, props.tournament.config.variant)}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            borderRadius: radius.pill,
            backgroundColor: isLive ? "rgba(173,255,47,0.12)" : colors.surfaceAlt
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: isLive ? colors.primary : colors.muted
            }}
          >
            {props.status}
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: props.onOpenOptions ? spacing.sm : 0
        }}
      >
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Players: {props.tournament.players.length}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Updated: {new Date(props.tournament.updatedAt).toLocaleTimeString()}
        </Text>
      </View>
      {props.onOpenOptions ? (
        <View style={{ flexDirection: "row" }}>
          <Pressable
            onPress={props.onOpenOptions}
            style={{
              minHeight: touch.minSecondary,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>Options</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

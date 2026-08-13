import { Pressable, Text, View } from "react-native";

import { radius, spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../types";

interface LiveTournamentPendingBannerProps {
  pendingPlayers: LiveTournamentState["pendingPlayers"];
  onOpenAddPendingPlayer: () => void;
  onOpenIntegrateConfirm: () => void;
}

export function LiveTournamentPendingBanner(props: LiveTournamentPendingBannerProps) {
  const { colors, cardStyles } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.label, { color: colors.muted, textTransform: "uppercase" }]}>
        Waiting Players
      </Text>
      {props.pendingPlayers.length === 0 ? (
        <Text style={{ color: colors.muted }}>No players in queue</Text>
      ) : (
        <View style={[cardStyles.container, { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }]}>
          {props.pendingPlayers.map((player) => (
            <View
              key={player.id}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border
              }}
            >
              <Text style={{ color: colors.text, fontSize: 12 }}>{player.name}</Text>
            </View>
          ))}
        </View>
      )}
      <Pressable
        onPress={props.onOpenAddPendingPlayer}
        style={{
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Add Player to Queue</Text>
      </Pressable>
      {props.pendingPlayers.length > 0 ? (
        <Pressable
          onPress={props.onOpenIntegrateConfirm}
          style={{
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center"
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Integrate Waiting Players</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

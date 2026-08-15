import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../types";

interface LiveTournamentPendingBannerProps {
  pendingPlayers: LiveTournamentState["pendingPlayers"];
  onOpenAddPendingPlayer: () => void;
  onOpenIntegrateConfirm: () => void;
}

export function LiveTournamentPendingBanner(props: LiveTournamentPendingBannerProps) {
  const { colors } = useTheme();
  if (props.pendingPlayers.length === 0) return null;

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.sm
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "600" }}>
        Waiting · {props.pendingPlayers.length}
      </Text>
      <Text style={{ color: colors.text, fontSize: 14 }}>
        {props.pendingPlayers.map((player) => player.name).join(", ")}
      </Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable
          onPress={props.onOpenAddPendingPlayer}
          style={{
            flex: 1,
            minHeight: touch.minSecondary,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Add</Text>
        </Pressable>
        <Pressable
          onPress={props.onOpenIntegrateConfirm}
          style={{
            flex: 1,
            minHeight: touch.minSecondary,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Integrate</Text>
        </Pressable>
      </View>
    </View>
  );
}

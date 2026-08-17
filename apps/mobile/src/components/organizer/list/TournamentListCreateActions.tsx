import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface TournamentListCreateActionsProps {
  onCreateAmericano: () => void;
  onCreateMexicano: () => void;
  onCreateKingOfTheCourt: () => void;
  onOpenEstimator: () => void;
  onOpenAccountPlayers?: () => void;
}

export function TournamentListCreateActions(props: TournamentListCreateActionsProps) {
  const { colors } = useTheme();

  const primary = {
    minHeight: touch.minPrimary,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: spacing.xl
  };
  const secondary = {
    minHeight: touch.minPrimary,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: spacing.xl
  };

  return (
    <View style={{ gap: spacing.md, width: "100%" }}>
      {props.onOpenAccountPlayers ? (
        <Pressable
          onPress={props.onOpenAccountPlayers}
          accessibilityRole="button"
          accessibilityLabel="Account leaderboard"
          style={{
            ...secondary,
            borderColor: colors.primary,
            alignItems: "flex-start",
            paddingVertical: spacing.md
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>Account Leaderboard</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
            Month / year / all time
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={props.onCreateAmericano}
        style={primary}
        accessibilityRole="button"
        accessibilityLabel="New Americano tournament"
      >
        <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 17 }}>New Americano</Text>
      </Pressable>
      <Pressable
        onPress={props.onCreateMexicano}
        style={secondary}
        accessibilityRole="button"
        accessibilityLabel="New Mexicano tournament"
      >
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>New Mexicano</Text>
      </Pressable>
      <Pressable
        onPress={props.onCreateKingOfTheCourt}
        style={secondary}
        accessibilityRole="button"
        accessibilityLabel="New King of the Court tournament"
      >
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>New King of the Court</Text>
      </Pressable>
      <Pressable
        onPress={props.onOpenEstimator}
        style={{ ...secondary, minHeight: touch.minSecondary }}
        accessibilityRole="button"
        accessibilityLabel="Game Estimator"
      >
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>Game Estimator</Text>
      </Pressable>
    </View>
  );
}

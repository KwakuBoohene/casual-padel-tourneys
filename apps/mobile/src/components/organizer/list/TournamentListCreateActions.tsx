import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface TournamentListCreateActionsProps {
  onCreateAmericano: () => void;
  onCreateMexicano: () => void;
  onCreateKingOfTheHill: () => void;
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
          style={{
            ...secondary,
            borderColor: colors.primary,
            alignItems: "flex-start",
            paddingVertical: spacing.md
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>Players</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
            Month / year leaderboard · who is best
          </Text>
        </Pressable>
      ) : null}
      <Pressable onPress={props.onCreateAmericano} style={primary}>
        <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 17 }}>New Americano</Text>
      </Pressable>
      <Pressable onPress={props.onCreateMexicano} style={secondary}>
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>New Mexicano</Text>
      </Pressable>
      <Pressable onPress={props.onCreateKingOfTheHill} style={secondary}>
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>New King of the Hill</Text>
      </Pressable>
      <Pressable onPress={props.onOpenEstimator} style={{ ...secondary, minHeight: touch.minSecondary }}>
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>Game Estimator</Text>
      </Pressable>
    </View>
  );
}

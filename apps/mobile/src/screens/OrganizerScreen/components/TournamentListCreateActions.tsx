import { Pressable, Text, View } from "react-native";

import { useBreakpoint } from "../../../layout";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface TournamentListCreateActionsProps {
  onCreateAmericano: () => void;
  onCreateMexicano: () => void;
  onCreateKingOfTheHill: () => void;
  onOpenEstimator: () => void;
}

export function TournamentListCreateActions(props: TournamentListCreateActionsProps) {
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();

  const buttonBase = {
    flex: isWide ? 0 : 1,
    flexGrow: isWide ? 1 : undefined,
    minWidth: isWide ? 160 : undefined,
    maxWidth: isWide ? 320 : undefined,
    minHeight: touch.minPrimary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center" as const,
    justifyContent: "center" as const
  };

  return (
    <View
      style={{
        marginTop: spacing.lg,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm
      }}
    >
      <Pressable
        onPress={props.onCreateAmericano}
        style={{ ...buttonBase, backgroundColor: colors.primary }}
      >
        <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Americano</Text>
      </Pressable>
      <Pressable
        onPress={props.onCreateMexicano}
        style={{ ...buttonBase, backgroundColor: colors.primary }}
      >
        <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Mexicano</Text>
      </Pressable>
      <Pressable
        onPress={props.onCreateKingOfTheHill}
        style={{
          ...buttonBase,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "700" }}>King of the Hill</Text>
      </Pressable>
      <Pressable
        onPress={props.onOpenEstimator}
        style={{
          ...buttonBase,
          minHeight: touch.minSecondary,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Game Estimator</Text>
      </Pressable>
    </View>
  );
}

import { Pressable, Text, View } from "react-native";

import { useBreakpoint } from "../../../layout";
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
  const { isWide, isMedium } = useBreakpoint();
  const multiCol = isWide || isMedium;

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

  const modeRowStyle = multiCol
    ? ({ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, width: "100%" } as const)
    : ({ gap: spacing.md, width: "100%" } as const);
  const modeBtnStyle = multiCol
    ? ({ flexGrow: 1, flexBasis: isWide ? 0 : "47%", minWidth: isWide ? 180 : 160 } as const)
    : ({ width: "100%" } as const);

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
      <View style={modeRowStyle}>
        <Pressable onPress={props.onCreateAmericano} style={[primary, modeBtnStyle]}>
          <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 17 }}>New Americano</Text>
        </Pressable>
        <Pressable onPress={props.onCreateMexicano} style={[secondary, modeBtnStyle]}>
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>New Mexicano</Text>
        </Pressable>
        <Pressable onPress={props.onCreateKingOfTheHill} style={[secondary, modeBtnStyle]}>
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>New King of the Hill</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={props.onOpenEstimator}
        style={{ ...secondary, minHeight: touch.minSecondary, alignSelf: multiCol ? "flex-start" : "stretch" }}
      >
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>Game Estimator</Text>
      </Pressable>
    </View>
  );
}

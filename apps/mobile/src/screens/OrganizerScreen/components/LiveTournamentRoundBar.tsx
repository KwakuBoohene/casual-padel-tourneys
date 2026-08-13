import { Pressable, Text, View } from "react-native";

import { radius, spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../types";

interface LiveTournamentRoundBarProps {
  displayedRound: LiveTournamentState["rounds"][number] | null;
  activeRound: LiveTournamentState["rounds"][number] | null;
  selectedRoundIndex: number;
  roundsCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  isLastRound: boolean;
  isTournamentCompleted: boolean;
  isEditingCompletedTournament: boolean;
  onPrevRound: () => void;
  onNextRound: () => void;
  onFinishTournament: () => void;
  onOpenEditConfirm: () => void;
  onSaveGameEdits: () => void;
}

export function LiveTournamentRoundBar(props: LiveTournamentRoundBarProps) {
  const { colors } = useTheme();

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <Text style={[typography.sectionTitle, { color: colors.text, flex: 1 }]}>
          {props.displayedRound ? `Round ${props.displayedRound.roundNumber}` : "No round"}
        </Text>
        {props.roundsCount > 1 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Pressable
              onPress={props.onPrevRound}
              disabled={!props.canGoPrev}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: props.canGoPrev ? colors.surface : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: props.canGoPrev ? 1 : 0.6
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>← Prev</Text>
            </Pressable>
            <Text style={{ color: colors.muted, fontSize: 12, minWidth: 48, textAlign: "center" }}>
              {props.selectedRoundIndex + 1} / {props.roundsCount}
            </Text>
            <Pressable
              onPress={props.onNextRound}
              disabled={!props.canGoNext}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: props.canGoNext ? colors.surface : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: props.canGoNext ? 1 : 0.6
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>Next →</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {props.isTournamentCompleted ? (
        <Text style={{ fontWeight: "700", color: colors.primary }}>Tournament Completed</Text>
      ) : null}
      {props.activeRound && props.isLastRound ? (
        <Pressable
          onPress={props.onFinishTournament}
          style={{
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center"
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Finish Tournament</Text>
        </Pressable>
      ) : null}
      {props.isTournamentCompleted && !props.isEditingCompletedTournament ? (
        <Pressable
          onPress={props.onOpenEditConfirm}
          style={{
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Edit Game</Text>
        </Pressable>
      ) : null}
      {props.isTournamentCompleted && props.isEditingCompletedTournament ? (
        <Pressable
          onPress={props.onSaveGameEdits}
          style={{
            marginTop: spacing.sm,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center"
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Save Game Edits</Text>
        </Pressable>
      ) : null}
    </>
  );
}

import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface LiveTournamentActionsProps {
  canSubmitScores: boolean;
  isTournamentCompleted: boolean;
  isEditingCompletedTournament: boolean;
  linkCopied: boolean;
  onSubmitRoundScores: () => void;
  onOpenEditConfirm: () => void;
  onSaveGameEdits: () => void;
  onShare: () => void;
  onViewLeaderboard: () => void;
  onOpenLiveOptions: () => void;
}

export function LiveTournamentActions(props: LiveTournamentActionsProps) {
  const { colors } = useTheme();

  let primaryLabel = "Submit round";
  let onPrimary = props.onSubmitRoundScores;
  let primaryDisabled = !props.canSubmitScores;

  if (props.isTournamentCompleted && props.isEditingCompletedTournament) {
    primaryLabel = "Save game edits";
    onPrimary = props.onSaveGameEdits;
    primaryDisabled = false;
  } else if (props.isTournamentCompleted) {
    primaryLabel = "Edit game";
    onPrimary = props.onOpenEditConfirm;
    primaryDisabled = false;
  }

  const secondary = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: touch.minPrimary,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.xs
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        disabled={primaryDisabled}
        onPress={onPrimary}
        style={{
          minHeight: touch.minPrimary,
          borderRadius: 14,
          backgroundColor: primaryDisabled ? colors.surfaceAlt : colors.primary,
          alignItems: "center",
          justifyContent: "center",
          opacity: primaryDisabled ? 0.55 : 1
        }}
      >
        <Text
          style={{
            color: primaryDisabled ? colors.text : colors.onPrimary,
            fontWeight: "700",
            fontSize: 17
          }}
        >
          {primaryLabel}
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {secondary(props.linkCopied ? "Copied" : "Share", props.onShare)}
        {secondary("Board", props.onViewLeaderboard)}
        {secondary("Options", props.onOpenLiveOptions)}
      </View>
    </View>
  );
}

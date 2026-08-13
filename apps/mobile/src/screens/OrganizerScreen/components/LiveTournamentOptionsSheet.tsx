import { Pressable, ScrollView, Text, View } from "react-native";

import { BottomSheet, SheetButton } from "../../../components/sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface LiveTournamentOptionsSheetProps {
  visible: boolean;
  currentCourts: number;
  proposedCourts: number;
  maxCourts: number;
  canAdjustCourts: boolean;
  onClose: () => void;
  onChangeProposedCourts: (value: number) => void;
  onOpenAdjustCourtsConfirm: () => void;
}

export function LiveTournamentOptionsSheet(props: LiveTournamentOptionsSheetProps) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={props.visible} title="Live Options" onDismiss={props.onClose}>
      {props.canAdjustCourts ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontWeight: "700", color: colors.text }}>Adjust Courts</Text>
          <Text style={{ color: colors.muted }}>Current courts: {props.currentCourts}</Text>
          <Text style={{ color: colors.muted }}>Proposed courts: {props.proposedCourts}</Text>
          <Text style={{ color: colors.muted }}>Allowed range: 1 - {props.maxCourts}</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <SheetButton
              label="-"
              style={{ flex: 1 }}
              disabled={props.proposedCourts <= 1}
              onPress={() => props.onChangeProposedCourts(Math.max(1, props.proposedCourts - 1))}
            />
            <SheetButton
              label="+"
              style={{ flex: 1 }}
              disabled={props.proposedCourts >= props.maxCourts}
              onPress={() =>
                props.onChangeProposedCourts(Math.min(props.maxCourts, props.proposedCourts + 1))
              }
            />
          </View>
          <SheetButton label="Apply Court Change" variant="primary" onPress={props.onOpenAdjustCourtsConfirm} />
        </View>
      ) : (
        <Text style={{ color: colors.muted }}>No court adjustment options available right now.</Text>
      )}
      <SheetButton label="Close" onPress={props.onClose} />
    </BottomSheet>
  );
}

interface LiveTournamentScorePickerSheetProps {
  visible: boolean;
  pointsPerMatch: number;
  scorePicker: { matchId: string; side: "scoreA" | "scoreB" } | null;
  onClose: () => void;
  onSelect: (value: number) => void;
  onReset: (matchId: string) => void;
}

export function LiveTournamentScorePickerSheet(props: LiveTournamentScorePickerSheetProps) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={props.visible} title="Select Score" onDismiss={props.onClose}>
      <Text style={{ color: colors.muted }}>Possible scores (1 to {props.pointsPerMatch})</Text>
      <ScrollView
        style={{ maxHeight: 180 }}
        contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}
      >
        {Array.from({ length: props.pointsPerMatch }, (_, index) => index + 1).map((score) => (
          <Pressable
            key={`score-${score}`}
            onPress={() => props.onSelect(score)}
            style={{
              minWidth: touch.minSecondary,
              minHeight: touch.minSecondary,
              paddingVertical: spacing.xs,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>{score}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <SheetButton
        label="Reset"
        onPress={() => {
          if (props.scorePicker) {
            props.onReset(props.scorePicker.matchId);
            props.onClose();
          }
        }}
      />
      <SheetButton label="Close" variant="primary" onPress={props.onClose} />
    </BottomSheet>
  );
}

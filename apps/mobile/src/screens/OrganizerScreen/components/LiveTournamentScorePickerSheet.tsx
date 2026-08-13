import { Pressable, ScrollView, Text, View } from "react-native";

import { BottomSheet, SheetButton } from "../../../components/sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface LiveTournamentScorePickerSheetProps {
  visible: boolean;
  pointsPerMatch: number;
  scorePicker: { matchId: string; side: "scoreA" | "scoreB" } | null;
  teamALabel: string;
  teamBLabel: string;
  onClose: () => void;
  onSelect: (value: number) => void;
  onChangeSide: (side: "scoreA" | "scoreB") => void;
  onReset: (matchId: string) => void;
}

export function LiveTournamentScorePickerSheet(props: LiveTournamentScorePickerSheetProps) {
  const { colors } = useTheme();
  const side = props.scorePicker?.side ?? "scoreA";

  const sideChip = (label: string, value: "scoreA" | "scoreB") => {
    const active = side === value;
    return (
      <Pressable
        onPress={() => props.onChangeSide(value)}
        style={{
          flex: 1,
          minHeight: touch.minSecondary,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primary : colors.surface,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.sm
        }}
      >
        <Text
          style={{
            color: active ? colors.onPrimary : colors.text,
            fontWeight: "700",
            fontSize: 13,
            textAlign: "center"
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <BottomSheet visible={props.visible} title="Select score" onDismiss={props.onClose}>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {sideChip(props.teamALabel, "scoreA")}
        {sideChip(props.teamBLabel, "scoreB")}
      </View>
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
      <SheetButton label="Done" variant="primary" onPress={props.onClose} />
    </BottomSheet>
  );
}

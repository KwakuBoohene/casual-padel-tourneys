import { Pressable, Text, View } from "react-native";

import { spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

import { BottomSheet } from "./BottomSheet";
import { SheetButton } from "./SheetButton";

export interface ScoreEntrySheetProps {
  visible: boolean;
  title: string;
  contextLine: string;
  teamALabel: string;
  teamBLabel: string;
  scoreA: number | null;
  scoreB: number | null;
  canUndo: boolean;
  saveDisabled?: boolean;
  onChangeScoreA: (next: number) => void;
  onChangeScoreB: (next: number) => void;
  onUndo: () => void;
  onSave: () => void;
  onDismiss: () => void;
  min?: number;
  max?: number;
}

function ScoreSideRow(props: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const { colors } = useTheme();
  const current = props.value ?? 0;
  const chip = (symbol: string, next: number, disabled: boolean) => (
    <Pressable
      onPress={() => props.onChange(next)}
      disabled={disabled}
      style={{
        minWidth: touch.minPrimary,
        minHeight: touch.minPrimary,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : 1
      }}
    >
      <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "700" }}>{symbol}</Text>
    </Pressable>
  );

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        padding: spacing.md,
        gap: spacing.sm
      }}
    >
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>{props.label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {chip("−", props.value === null ? 0 : current - 1, props.value !== null && current <= props.min)}
        <Text style={{ color: colors.text, fontSize: 36, fontWeight: "700", minWidth: 48, textAlign: "center" }}>
          {props.value === null ? "–" : props.value}
        </Text>
        {chip("+", props.value === null ? 0 : current + 1, props.value !== null && current >= props.max)}
      </View>
    </View>
  );
}

export function ScoreEntrySheet(props: ScoreEntrySheetProps) {
  const { colors } = useTheme();
  const min = props.min ?? 0;
  const max = props.max ?? 99;

  return (
    <BottomSheet visible={props.visible} title={props.title} onDismiss={props.onDismiss}>
      <Text style={{ color: colors.muted, fontSize: 14 }}>{props.contextLine}</Text>
      <ScoreSideRow
        label={props.teamALabel}
        value={props.scoreA}
        min={min}
        max={max}
        onChange={props.onChangeScoreA}
      />
      <ScoreSideRow
        label={props.teamBLabel}
        value={props.scoreB}
        min={min}
        max={max}
        onChange={props.onChangeScoreB}
      />
      <SheetButton
        label="Undo"
        disabled={!props.canUndo}
        onPress={props.onUndo}
        style={{ minHeight: touch.minPrimary }}
      />
      <SheetButton
        label="Save"
        variant="primary"
        disabled={props.saveDisabled}
        onPress={props.onSave}
      />
    </BottomSheet>
  );
}

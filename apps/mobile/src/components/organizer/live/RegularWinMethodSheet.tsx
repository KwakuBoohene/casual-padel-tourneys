import { Pressable, Text, View } from "react-native";

import type { KohGameWinMethod, MatchSet } from "@padel/shared";
import { BottomSheet, SheetButton } from "../../sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface RegularWinMethodSheetProps {
  visible: boolean;
  teamALabel: string;
  teamBLabel: string;
  sets: MatchSet[];
  setIndex: number;
  confirmLabel: string;
  saving: boolean;
  onChangeMethod: (setIndex: number, side: "A" | "B", gameIndex: number, method: KohGameWinMethod) => void;
  onConfirm: () => void;
  onDismiss: () => void;
}

const METHODS: KohGameWinMethod[] = ["REGULAR", "GOLDEN", "STAR"];

function methodLabel(method: KohGameWinMethod): string {
  if (method === "REGULAR") return "Regular";
  if (method === "GOLDEN") return "Golden";
  return "Star";
}

export function RegularWinMethodSheet(props: RegularWinMethodSheetProps) {
  const { colors } = useTheme();
  const set = props.sets[props.setIndex];

  return (
    <BottomSheet
      visible={props.visible}
      title={`Set ${set?.setNumber ?? props.setIndex + 1} win methods`}
      onDismiss={props.onDismiss}
    >
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        How each game was won (default Regular).
      </Text>
      {set ? (
        <View style={{ gap: spacing.sm }}>
          {set.winMethodsA?.map((method, index) => (
            <MethodRow
              key={`A-${set.setNumber}-${index}`}
              label={`${props.teamALabel} · Game ${index + 1}`}
              method={method}
              onChange={(next) => props.onChangeMethod(props.setIndex, "A", index, next)}
            />
          ))}
          {set.winMethodsB?.map((method, index) => (
            <MethodRow
              key={`B-${set.setNumber}-${index}`}
              label={`${props.teamBLabel} · Game ${index + 1}`}
              method={method}
              onChange={(next) => props.onChangeMethod(props.setIndex, "B", index, next)}
            />
          ))}
        </View>
      ) : null}
      <SheetButton
        label={props.saving ? "Saving…" : props.confirmLabel}
        variant="primary"
        disabled={props.saving}
        onPress={props.onConfirm}
      />
    </BottomSheet>
  );
}

function MethodRow(props: {
  label: string;
  method: KohGameWinMethod;
  onChange: (method: KohGameWinMethod) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>{props.label}</Text>
      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        {METHODS.map((option) => {
          const selected = props.method === option;
          return (
            <Pressable
              key={option}
              onPress={() => props.onChange(option)}
              style={{
                flex: 1,
                minHeight: touch.minSecondary,
                borderRadius: radius.md,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.primary : colors.border,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 12 }}>
                {methodLabel(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

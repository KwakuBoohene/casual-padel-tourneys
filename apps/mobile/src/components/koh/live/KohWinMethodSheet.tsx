import { Pressable, Text, View } from "react-native";

import type { KohGameWinMethod } from "@padel/shared";
import { BottomSheet, SheetButton } from "../../sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import type { KohScoreDraft } from "../../../utilities/koh/scorePayload";

interface KohWinMethodSheetProps {
  visible: boolean;
  draft: KohScoreDraft;
  kingLabel: string;
  challengerLabel: string;
  saving: boolean;
  onChangeMethod: (side: "A" | "B", index: number, method: KohGameWinMethod) => void;
  onConfirm: () => void;
  onDismiss: () => void;
}

const METHODS: KohGameWinMethod[] = ["REGULAR", "GOLDEN", "STAR"];

export function KohWinMethodSheet(props: KohWinMethodSheetProps) {
  const { colors } = useTheme();

  const row = (side: "A" | "B", index: number, method: KohGameWinMethod, label: string) => (
    <View key={`${side}-${index}`} style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>
        {label} · Game {index + 1}
      </Text>
      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        {METHODS.map((option) => {
          const selected = method === option;
          return (
            <Pressable
              key={option}
              onPress={() => props.onChangeMethod(side, index, option)}
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
                {option === "REGULAR" ? "Regular" : option === "GOLDEN" ? "Golden" : "Star"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <BottomSheet visible={props.visible} title="Win methods" onDismiss={props.onDismiss}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        How each game was won (default Regular).
      </Text>
      {props.draft.winMethodsA.map((method, index) =>
        row("A", index, method, props.kingLabel)
      )}
      {props.draft.winMethodsB.map((method, index) =>
        row("B", index, method, props.challengerLabel)
      )}
      <SheetButton
        label={props.saving ? "Saving…" : "Confirm result"}
        variant="primary"
        disabled={props.saving}
        onPress={props.onConfirm}
      />
    </BottomSheet>
  );
}

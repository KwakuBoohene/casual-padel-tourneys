import { Pressable, Text, View } from "react-native";

import { BottomSheet, SheetButton } from "../../sheets";
import { spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface LiveAdjustCourtsSheetProps {
  visible: boolean;
  currentCourts: number;
  proposedCourts: number;
  maxCourts: number;
  onClose: () => void;
  onChangeProposedCourts: (value: number) => void;
  onContinue: () => void;
}

export function LiveAdjustCourtsSheet(props: LiveAdjustCourtsSheetProps) {
  const { colors } = useTheme();
  const options = Array.from({ length: props.maxCourts }, (_, index) => index + 1);

  return (
    <BottomSheet visible={props.visible} title="Adjust courts" onDismiss={props.onClose}>
      <Text style={{ color: colors.muted, fontSize: 14 }}>Recalculate remaining rounds</Text>
      <View style={{ gap: spacing.sm }}>
        {options.map((courts) => {
          const selected = courts === props.proposedCourts;
          const isCurrent = courts === props.currentCourts;
          return (
            <Pressable
              key={`courts-${courts}`}
              onPress={() => props.onChangeProposedCourts(courts)}
              style={{
                minHeight: touch.minSecondary,
                borderRadius: 14,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: colors.surface,
                paddingHorizontal: spacing.md,
                justifyContent: "center"
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}>
                {courts} court{courts === 1 ? "" : "s"}
                {isCurrent ? " (current)" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <SheetButton label="Cancel" onPress={props.onClose} style={{ minHeight: touch.minPrimary }} />
      <SheetButton
        label="Apply"
        variant="primary"
        disabled={props.proposedCourts === props.currentCourts}
        onPress={props.onContinue}
      />
    </BottomSheet>
  );
}

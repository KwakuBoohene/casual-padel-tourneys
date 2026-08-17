import { Text, TextInput, View } from "react-native";

import { BottomSheet, SheetButton } from "../sheets";
import { radius, spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface KohAddPairSheetProps {
  visible: boolean;
  courtNumber: number;
  playerA: string;
  playerB: string;
  onChangePlayerA: (value: string) => void;
  onChangePlayerB: (value: string) => void;
  onSave: () => void;
  onDismiss: () => void;
}

export function KohAddPairSheet(props: KohAddPairSheetProps) {
  const { colors } = useTheme();

  const field = (label: string, value: string, onChange: (value: string) => void) => (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <Text style={{ fontSize: 11, color: colors.muted, fontWeight: "600" }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Player name"
        placeholderTextColor={colors.muted}
        style={{ color: colors.text, fontSize: 17, fontWeight: "600", paddingVertical: spacing.xs }}
      />
    </View>
  );

  return (
    <BottomSheet
      visible={props.visible}
      title="Add doubles"
      onDismiss={props.onDismiss}
    >
      <View style={{ gap: spacing.md }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Court {props.courtNumber} — two players
        </Text>
        {field("PLAYER 1", props.playerA, props.onChangePlayerA)}
        {field("PLAYER 2", props.playerB, props.onChangePlayerB)}
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Players are tracked individually for performance over time.
        </Text>
        <SheetButton label="Save pair" onPress={props.onSave} />
        <SheetButton label="Cancel" onPress={props.onDismiss} />
      </View>
    </BottomSheet>
  );
}

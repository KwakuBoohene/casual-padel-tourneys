import { Text, TextInput } from "react-native";

import { BottomSheet, SheetButton } from "../../sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface KohEditUnitSheetsProps {
  renamePlayerId: string | null;
  renameValue: string;
  saving: boolean;
  onRenameValue: (value: string) => void;
  onDismiss: () => void;
  onSubmitRename: () => void;
}

export function KohEditUnitSheets(props: KohEditUnitSheetsProps) {
  const { colors } = useTheme();
  return (
    <BottomSheet
      visible={Boolean(props.renamePlayerId)}
      title="Rename"
      onDismiss={props.onDismiss}
    >
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        Fix a spelling mistake. Stats stay on the same player.
      </Text>
      <TextInput
        value={props.renameValue}
        onChangeText={props.onRenameValue}
        placeholder="Player name"
        placeholderTextColor={colors.muted}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          color: colors.text,
          minHeight: touch.minSecondary
        }}
      />
      <SheetButton
        label={props.saving ? "Saving…" : "Save"}
        disabled={props.saving || !props.renameValue.trim()}
        onPress={props.onSubmitRename}
      />
    </BottomSheet>
  );
}

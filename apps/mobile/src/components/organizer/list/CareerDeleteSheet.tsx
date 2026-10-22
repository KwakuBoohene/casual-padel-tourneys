import { Text } from "react-native";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { BottomSheet, SheetButton } from "../../sheets";

export function CareerDeleteSheet(props: {
  visible: boolean;
  saving?: boolean;
  onRemove: () => void;
  onKeep: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={props.visible} busy={props.saving} title="Account leaderboard" onDismiss={props.onCancel}>
      <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>
        Also remove this tournament from the account leaderboard? Player rankings and match recents
        from this night will be dropped.
      </Text>
      <SheetButton label={props.saving ? "Deleting…" : "Remove from leaderboard"} disabled={props.saving} variant="danger" onPress={props.onRemove} />
      <SheetButton label="Keep on leaderboard" disabled={props.saving} onPress={props.onKeep} />
      <SheetButton label="Cancel" disabled={props.saving} onPress={props.onCancel} />
    </BottomSheet>
  );
}

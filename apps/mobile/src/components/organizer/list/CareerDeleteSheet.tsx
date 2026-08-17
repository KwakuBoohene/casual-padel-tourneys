import { Text } from "react-native";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { BottomSheet, SheetButton } from "../../sheets";

export function CareerDeleteSheet(props: {
  visible: boolean;
  onRemove: () => void;
  onKeep: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={props.visible} title="Account leaderboard" onDismiss={props.onCancel}>
      <Text style={{ color: colors.muted, marginBottom: spacing.sm }}>
        Also remove this tournament from the account leaderboard? Player rankings and match recents
        from this night will be dropped.
      </Text>
      <SheetButton label="Remove from leaderboard" variant="danger" onPress={props.onRemove} />
      <SheetButton label="Keep on leaderboard" onPress={props.onKeep} />
      <SheetButton label="Cancel" onPress={props.onCancel} />
    </BottomSheet>
  );
}

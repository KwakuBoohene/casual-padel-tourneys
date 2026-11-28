import { Text, View } from "react-native";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { BottomSheet, SheetButton } from "../../sheets";

export interface LeaveWizardSheetProps {
  visible: boolean;
  busy: boolean;
  failed: boolean;
  onSave: () => void;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

/** "Save this as a draft?" when leaving an unsaved wizard (Figma 03 · `3:95`). */
export function LeaveWizardSheet(props: LeaveWizardSheetProps) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={props.visible} title="Save this as a draft?" onDismiss={props.onKeepEditing} busy={props.busy}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: 14, color: colors.muted }}>
          Save it to finish later or share it with a co-organizer. Discarding removes everything you entered.
        </Text>
        {props.failed ? (
          <Text style={{ fontSize: 13, color: colors.danger }}>Couldn&apos;t save. Check your connection and try again.</Text>
        ) : null}
        <SheetButton label={props.busy ? "Saving…" : "Save draft"} variant="primary" disabled={props.busy} onPress={props.onSave} />
        <SheetButton label="Keep editing" disabled={props.busy} onPress={props.onKeepEditing} />
        <SheetButton label="Discard" variant="danger" disabled={props.busy} onPress={props.onDiscard} />
      </View>
    </BottomSheet>
  );
}

import { Text, View } from "react-native";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { BottomSheet, SheetButton } from "../../sheets";

export interface LeaveWizardSheetProps {
  visible: boolean;
  /** `unsaved`: never saved as a draft. `unsynced`: a saved draft whose latest edits didn't save. */
  variant: "unsaved" | "unsynced";
  busy: boolean;
  failed: boolean;
  actions: {
    onSave: () => void;
    onKeepEditing: () => void;
    onDiscard: () => void;
  };
}

const COPY = {
  unsaved: {
    title: "Save this as a draft?",
    body: "Save it to finish later or share it with a co-organizer. Discarding removes everything you entered.",
    save: "Save draft",
    discard: "Discard"
  },
  unsynced: {
    title: "Your latest changes aren't saved",
    body: "We couldn't reach the server. If you leave now, the changes you made since the last save are lost.",
    save: "Try again",
    discard: "Leave without saving"
  }
} as const;

/** Leaving the wizard with work that isn't on the server (Figma 03 · `3:95`). */
export function LeaveWizardSheet({ visible, variant, busy, failed, actions }: LeaveWizardSheetProps) {
  const { colors } = useTheme();
  const copy = COPY[variant];
  return (
    <BottomSheet visible={visible} title={copy.title} onDismiss={actions.onKeepEditing} busy={busy}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: 14, color: colors.muted }}>{copy.body}</Text>
        {failed && variant === "unsaved" ? (
          <Text style={{ fontSize: 13, color: colors.danger }}>
            Couldn&apos;t save. Check your connection and try again.
          </Text>
        ) : null}
        <SheetButton label={busy ? "Saving…" : copy.save} variant="primary" disabled={busy} onPress={actions.onSave} />
        <SheetButton label="Keep editing" disabled={busy} onPress={actions.onKeepEditing} />
        <SheetButton label={copy.discard} variant="danger" disabled={busy} onPress={actions.onDiscard} />
      </View>
    </BottomSheet>
  );
}

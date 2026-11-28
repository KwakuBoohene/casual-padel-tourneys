import { View } from "react-native";

import type { DraftListController } from "../../../hooks/organizer/drafts/useDraftList";
import { spacing } from "../../../theme";
import { AlertSheet, BottomSheet, SheetButton } from "../../sheets";

interface DraftOptionsSheetsProps {
  options: DraftListController["options"];
  onContinueEditing: (draftId: string) => void;
}

/** Long-press options for a draft: continue editing, or delete (owner / managers only). */
export function DraftOptionsSheets({ options, onContinueEditing }: DraftOptionsSheetsProps) {
  const draft = options.draft;
  const canDelete = draft?.role !== "EDITOR";
  const name = draft?.name.trim() || "this draft";

  return (
    <>
      <BottomSheet visible={Boolean(draft) && !options.confirming} title="Draft options" onDismiss={options.close}>
        <View style={{ gap: spacing.sm }}>
          <SheetButton label="Continue editing" variant="primary" onPress={() => draft && onContinueEditing(draft.id)} />
          {canDelete ? <SheetButton label="Delete draft" variant="danger" onPress={options.requestDelete} /> : null}
          <SheetButton label="Cancel" onPress={options.close} />
        </View>
      </BottomSheet>

      <AlertSheet
        visible={Boolean(draft) && options.confirming}
        variant="warning"
        title="Delete draft?"
        message={options.deleteError ?? `Delete ${name}? Co-organizers will lose access too. This can't be undone.`}
        busy={options.deleting}
        busyLabel="Deleting…"
        primaryAction={{ label: "Delete", destructive: true, onPress: options.confirmDelete }}
        secondaryAction={{ label: "Cancel", onPress: options.cancelDelete }}
        onDismiss={options.cancelDelete}
      />
    </>
  );
}

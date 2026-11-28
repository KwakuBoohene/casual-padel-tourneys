import { Pressable, Text, View } from "react-native";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { useCreateDraftContext } from "./CreateDraftContext";

const timeOf = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** "Save draft" in the wizard header, then a quiet save status (Figma 02 · `3:67`). */
export function DraftSaveAction() {
  const { colors } = useTheme();
  const draft = useCreateDraftContext();
  if (!draft || !draft.canSave) return null;

  const status =
    draft.status === "saving"
      ? { text: "Saving…", color: colors.muted }
      : draft.status === "error"
        ? { text: "Not saved · retry", color: colors.danger }
        : draft.status === "conflict"
          ? { text: "Updated elsewhere", color: colors.statusNext }
          : draft.lastSavedAt
            ? { text: `✓ Draft saved · ${timeOf(draft.lastSavedAt)}`, color: colors.statusCompleted }
            : null;
  const showButton = !draft.lastSavedAt || draft.status === "error";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      {status ? (
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 12, color: status.color }}>
          {status.text}
        </Text>
      ) : null}
      {showButton ? (
        <Pressable
          onPress={draft.saveDraft}
          disabled={draft.status === "saving"}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Save draft"
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.primary }}>Save draft</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

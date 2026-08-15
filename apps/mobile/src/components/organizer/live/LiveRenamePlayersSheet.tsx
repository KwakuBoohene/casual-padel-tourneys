import { ScrollView, Text, TextInput, View } from "react-native";

import { BottomSheet, SheetButton } from "../../sheets";
import { spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface LiveRenamePlayersSheetProps {
  visible: boolean;
  players: Array<{ id: string; name: string }>;
  drafts: Record<string, string>;
  saving: boolean;
  onChangeDraft: (playerId: string, name: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function LiveRenamePlayersSheet(props: LiveRenamePlayersSheetProps) {
  const { colors } = useTheme();
  const dirty = props.players.some((player) => {
    const draft = props.drafts[player.id]?.trim() ?? "";
    return draft.length > 0 && draft !== player.name;
  });

  return (
    <BottomSheet visible={props.visible} title="Rename players" onDismiss={props.onClose}>
      <Text style={{ color: colors.muted, fontSize: 14 }}>Fix names mid-event</Text>
      <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: spacing.sm }}>
        {props.players.map((player) => (
          <View
            key={player.id}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: spacing.md,
              gap: spacing.xs
            }}
          >
            <TextInput
              value={props.drafts[player.id] ?? player.name}
              onChangeText={(value) => props.onChangeDraft(player.id, value)}
              placeholder="Player name"
              placeholderTextColor={colors.muted}
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: "600",
                minHeight: touch.minSecondary,
                padding: 0
              }}
            />
          </View>
        ))}
      </ScrollView>
      <SheetButton label="Cancel" onPress={props.onClose} style={{ minHeight: touch.minPrimary }} />
      <SheetButton
        label={props.saving ? "Saving…" : "Save names"}
        variant="primary"
        disabled={!dirty || props.saving}
        onPress={props.onSave}
      />
    </BottomSheet>
  );
}

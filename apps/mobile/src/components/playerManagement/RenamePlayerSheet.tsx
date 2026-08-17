import { useEffect, useState } from "react";
import { Text, TextInput } from "react-native";
import type { OrganizerManagedPlayer } from "@padel/shared";

import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { BottomSheet, SheetButton } from "../sheets";

export function RenamePlayerSheet(props: {
  player: OrganizerManagedPlayer | null;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  useEffect(() => {
    setName(props.player?.name ?? "");
  }, [props.player]);

  return (
    <BottomSheet visible={Boolean(props.player)} title="Rename player" onDismiss={props.onCancel}>
      <Text style={{ color: colors.muted }}>This name is used on the account leaderboard.</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder="Player name"
        placeholderTextColor={colors.muted}
        style={{
          minHeight: touch.minSecondary,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          color: colors.text
        }}
      />
      <SheetButton
        label="Save"
        variant="primary"
        disabled={!name.trim()}
        onPress={() => props.onConfirm(name.trim())}
      />
      <SheetButton label="Cancel" onPress={props.onCancel} />
    </BottomSheet>
  );
}

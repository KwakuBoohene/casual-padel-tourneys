import { Pressable, Text, TextInput, View } from "react-native";
import type { OrganizerManagedPlayer } from "@padel/shared";

import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { BottomSheet, SheetButton } from "../sheets";

export function MergeConfirmSheet(props: {
  visible: boolean;
  playerA: OrganizerManagedPlayer | null;
  playerB: OrganizerManagedPlayer | null;
  survivingName: string;
  onChangeName: (name: string) => void;
  busy: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const playerA = props.playerA;
  const playerB = props.playerB;
  if (!playerA || !playerB) return null;
  const combinedWins = playerA.matchesWon + playerB.matchesWon;
  return (
    <BottomSheet visible={props.visible} title="Confirm merge" onDismiss={props.onDismiss}>
      <Text style={{ color: colors.text, lineHeight: 20 }}>
        We’ll create one {props.survivingName || "player"} with {combinedWins} match wins (and the
        rest of both records). {playerA.name} and {playerB.name} will be archived.
      </Text>
      <Text style={{ color: colors.muted, fontWeight: "700" }}>Surviving name</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {[playerA.name, playerB.name].map((name) => (
          <Pressable
            key={name}
            onPress={() => props.onChangeName(name)}
            style={{
              flex: 1,
              minHeight: touch.minSecondary,
              borderRadius: radius.lg,
              borderWidth: props.survivingName === name ? 2 : 1,
              borderColor: props.survivingName === name ? colors.primary : colors.border,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }} numberOfLines={1}>
              {name}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={props.survivingName}
        onChangeText={props.onChangeName}
        placeholder="Or type a name"
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
        label={props.busy ? "Merging…" : "Merge"}
        variant="primary"
        disabled={props.busy || !props.survivingName.trim()}
        onPress={props.onConfirm}
      />
      <SheetButton label="Cancel" onPress={props.onDismiss} />
    </BottomSheet>
  );
}

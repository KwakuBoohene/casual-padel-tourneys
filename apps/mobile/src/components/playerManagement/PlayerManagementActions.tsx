import { Pressable, Text, View } from "react-native";
import type { OrganizerPlayerStatus } from "@padel/shared";

import { spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

export function PlayerManagementActions(props: {
  status: OrganizerPlayerStatus;
  canMerge: boolean;
  selecting: boolean;
  selectedCount: number;
  playerCount: number;
  onMerge: () => void;
  onStartSelect: () => void;
  onCancelSelect: () => void;
  onSelectAll: () => void;
  onApplySelected: () => void;
}) {
  const { colors } = useTheme();
  const link = { minHeight: touch.minSecondary, justifyContent: "center" as const };
  if (props.playerCount === 0) return null;

  if (props.selecting) {
    const allSelected = props.selectedCount === props.playerCount;
    const applyLabel =
      props.status === "active"
        ? `Archive ${props.selectedCount || ""}`.trim()
        : `Unarchive ${props.selectedCount || ""}`.trim();
    return (
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <Pressable onPress={props.onSelectAll} style={[link, { flex: 1 }]}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {allSelected ? "Clear" : "Select all"}
            </Text>
          </Pressable>
          <Pressable onPress={props.onCancelSelect} style={[link, { flex: 1 }]}>
            <Text style={{ color: colors.muted, fontWeight: "700" }}>Cancel</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={props.onApplySelected}
          disabled={props.selectedCount === 0}
          style={[link, { opacity: props.selectedCount === 0 ? 0.4 : 1 }]}
        >
          <Text
            style={{
              color: props.status === "active" ? colors.danger : colors.primary,
              fontWeight: "700"
            }}
          >
            {applyLabel}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", gap: spacing.md, flexWrap: "wrap" }}>
      {props.canMerge ? (
        <Pressable onPress={props.onMerge} style={link}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Merge two players</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={props.onStartSelect} style={link}>
        <Text style={{ color: colors.primary, fontWeight: "700" }}>Select</Text>
      </Pressable>
    </View>
  );
}

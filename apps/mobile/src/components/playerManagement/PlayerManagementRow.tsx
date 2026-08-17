import { Pressable, Text, View } from "react-native";
import type { OrganizerManagedPlayer, OrganizerPlayerStatus } from "@padel/shared";

import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

export function PlayerStatusTabs(props: {
  status: OrganizerPlayerStatus;
  onStatus: (status: OrganizerPlayerStatus) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {(["active", "archived"] as const).map((id) => {
        const active = props.status === id;
        return (
          <Pressable
            key={id}
            onPress={() => props.onStatus(id)}
            style={{
              flex: 1,
              minHeight: touch.minSecondary,
              borderRadius: radius.pill,
              borderWidth: active ? 2 : 1,
              borderColor: active ? colors.primary : colors.border,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: active ? colors.primary : colors.text, fontWeight: "700" }}>
              {id === "active" ? "Active" : "Archived"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PlayerManagementRow(props: {
  player: OrganizerManagedPlayer;
  status: OrganizerPlayerStatus;
  onAction: () => void;
}) {
  const { colors } = useTheme();
  const record = `${props.player.matchesWon}–${props.player.matchesLost}`;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: touch.minSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.text, fontWeight: "700" }} numberOfLines={1}>
          {props.player.name}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{record}</Text>
      </View>
      <Pressable onPress={props.onAction} hitSlop={8}>
        <Text style={{ color: props.status === "active" ? colors.danger : colors.primary, fontWeight: "700" }}>
          {props.status === "active" ? "Archive" : "Unarchive"}
        </Text>
      </Pressable>
    </View>
  );
}

import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { STANDINGS_COLUMNS, type StandingsColumnKey } from "@padel/shared";

import { spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { BottomSheet, SheetButton } from "../sheets";

function ColumnToggleRow(props: {
  header: string;
  title: string;
  checked: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: props.checked }}
      accessibilityLabel={props.title}
      style={{
        minHeight: touch.minSecondary,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: props.checked ? colors.primary : colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
      }}
    >
      <Text
        style={{
          width: 46,
          color: props.checked ? colors.primary : colors.muted,
          fontWeight: "700",
          fontSize: 14
        }}
      >
        {props.header}
      </Text>
      <Text style={{ flex: 1, color: colors.text, fontSize: 14 }} numberOfLines={1}>
        {props.title}
      </Text>
      <Text style={{ color: props.checked ? colors.primary : colors.border, fontSize: 16 }}>
        {props.checked ? "✓" : "○"}
      </Text>
    </Pressable>
  );
}

/** Pick which stat columns the standings tables show. The choice is per device. */
export function StandingsColumnsSheet(props: {
  visible: boolean;
  selected: StandingsColumnKey[];
  onToggle: (key: StandingsColumnKey) => void;
  onReset: () => void;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  return (
    <BottomSheet visible={props.visible} title="Columns" onDismiss={props.onDismiss}>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: spacing.sm }}>
        Shown on every leaderboard on this device. Exports always include every column.
      </Text>
      <ScrollView
        style={{ maxHeight: height * 0.45 }}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
      >
        {STANDINGS_COLUMNS.map((column) => (
          <ColumnToggleRow
            key={column.key}
            header={column.header}
            title={column.title}
            checked={props.selected.includes(column.key)}
            onPress={() => props.onToggle(column.key)}
          />
        ))}
      </ScrollView>
      <View style={{ gap: spacing.sm }}>
        <SheetButton label="Reset to default" variant="secondary" onPress={props.onReset} />
        <SheetButton label="Done" onPress={props.onDismiss} />
      </View>
    </BottomSheet>
  );
}

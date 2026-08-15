import { Pressable, Text, View } from "react-native";

import type { KohDraftUnit } from "../../types/koh/create";
import { unitRoleLabel } from "../../utilities/koh/createDraft";
import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface KohUnitRowProps {
  unit: KohDraftUnit;
  index: number;
  selected: boolean;
  onSelect: () => void;
}

export function KohUnitRow(props: KohUnitRowProps) {
  const { colors } = useTheme();
  const role = unitRoleLabel(props.index);

  return (
    <Pressable
      onPress={props.onSelect}
      style={{
        minHeight: touch.minSecondary,
        borderRadius: radius.lg,
        borderWidth: props.selected ? 2 : 1,
        borderColor: props.selected ? colors.primary : colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm
      }}
    >
      <Text style={{ flex: 1, color: colors.text, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
        {props.unit.playerAName} / {props.unit.playerBName}
      </Text>
      <View
        style={{
          borderRadius: radius.md,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          backgroundColor: role === "KING" ? colors.primary : colors.surfaceAlt
        }}
      >
        <Text
          style={{
            color: role === "KING" ? colors.onPrimary : colors.muted,
            fontWeight: "700",
            fontSize: 12
          }}
        >
          {role}
        </Text>
      </View>
    </Pressable>
  );
}

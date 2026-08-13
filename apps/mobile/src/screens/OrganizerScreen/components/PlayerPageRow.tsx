import { Pressable, Text, View } from "react-native";
import type { PlayerGender } from "@padel/shared";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface PlayerPageRowProps {
  name: string;
  gender?: PlayerGender;
  showGender: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

export function PlayerPageRow(props: PlayerPageRowProps) {
  const { colors } = useTheme();
  const genderLabel =
    props.gender === "MALE" ? "M" : props.gender === "FEMALE" ? "F" : "?";

  return (
    <View
      style={{
        minHeight: touch.minSecondary,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }} numberOfLines={1}>
          {props.name}
        </Text>
        {props.showGender ? (
          <Text style={{ color: colors.muted, fontSize: 12 }}>Gender: {genderLabel}</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
        <Pressable onPress={props.onEdit} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: "500", fontSize: 13 }}>Edit</Text>
        </Pressable>
        <Text style={{ color: colors.primary }}>·</Text>
        <Pressable onPress={props.onRemove} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: "500", fontSize: 13 }}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

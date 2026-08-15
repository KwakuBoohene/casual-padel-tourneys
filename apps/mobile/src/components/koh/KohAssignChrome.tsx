import { Pressable, Text, View } from "react-native";

import type { KohDraftCourt } from "../../types/koh/create";
import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface KohAssignActionsProps {
  canAdd: boolean;
  onAddPair: () => void;
  onRandomize: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function KohAssignActions(props: KohAssignActionsProps) {
  const { colors } = useTheme();
  const secondary = (label: string, onPress: () => void, disabled?: boolean) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: touch.minSecondary,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {secondary("Add pair", props.onAddPair, !props.canAdd)}
        {secondary("Randomize", props.onRandomize)}
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {secondary("Move up", props.onMoveUp)}
        {secondary("Move down", props.onMoveDown)}
      </View>
    </View>
  );
}

interface KohCourtPagerProps {
  courtUnits: KohDraftCourt[];
  assignCourtIndex: number;
  onSelectCourt: (index: number) => void;
}

export function KohCourtPager(props: KohCourtPagerProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
      {props.courtUnits.map((entry, index) => {
        const selected = index === props.assignCourtIndex;
        return (
          <Pressable
            key={entry.courtNumber}
            onPress={() => props.onSelectCourt(index)}
            style={{
              minHeight: touch.minSecondary,
              paddingHorizontal: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: selected ? colors.primary : colors.surfaceAlt,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text
              style={{
                color: selected ? colors.onPrimary : colors.text,
                fontWeight: "700",
                fontSize: 13
              }}
            >
              {entry.courtNumber === 1 ? "1 Top" : String(entry.courtNumber)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

import { Pressable, Text, View } from "react-native";

import type { KohUnit } from "@padel/shared";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface KohLiveUnitCardProps {
  label: "KING" | "CHALLENGER" | "WAIT";
  unit: KohUnit;
  emphasized?: boolean;
  quiet?: boolean;
}

export function KohLiveUnitCard(props: KohLiveUnitCardProps) {
  const { colors } = useTheme();
  const quiet = props.quiet || props.label === "WAIT";
  const labelColor =
    props.label === "KING" ? colors.primary : quiet ? colors.muted : colors.text;
  return (
    <View
      style={{
        minHeight: touch.minSecondary,
        borderRadius: radius.lg,
        borderWidth: props.emphasized ? 2 : 1,
        borderColor: props.emphasized ? colors.primary : colors.border,
        backgroundColor: quiet ? colors.surfaceAlt : colors.surface,
        padding: spacing.md,
        gap: spacing.xs
      }}
    >
      <Text
        style={{
          color: labelColor,
          fontWeight: "700",
          fontSize: 12
        }}
      >
        {props.label}
      </Text>
      <Text
        style={{
          color: quiet ? colors.muted : colors.text,
          fontWeight: quiet ? "600" : "700",
          fontSize: quiet ? 15 : 16
        }}
      >
        {props.unit.playerAName} / {props.unit.playerBName}
      </Text>
    </View>
  );
}

interface KohLiveCourtPagerProps {
  courtCount: number;
  courtIndex: number;
  onSelect: (index: number) => void;
}

export function KohLiveCourtPager(props: KohLiveCourtPagerProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
      {Array.from({ length: props.courtCount }, (_, index) => {
        const selected = index === props.courtIndex;
        const label = index === 0 ? "1 Top" : String(index + 1);
        return (
          <Pressable
            key={label}
            onPress={() => props.onSelect(index)}
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
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

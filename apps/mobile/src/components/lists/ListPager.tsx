import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface ListPagerProps {
  total: number;
  pageStart: number;
  pageEnd: number;
  pageIndex: number;
  pageCount: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function ListPager(props: ListPagerProps) {
  const { colors } = useTheme();
  if (props.pageCount <= 1) return null;
  const from = props.total === 0 ? 0 : props.pageStart + 1;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
        marginTop: spacing.sm
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 12, flex: 1 }}>
        {from}–{props.pageEnd} of {props.total}
      </Text>
      <Pressable
        onPress={props.onPrev}
        disabled={!props.canGoPrev}
        style={{
          minHeight: touch.minSecondary,
          minWidth: 72,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          opacity: props.canGoPrev ? 1 : 0.4
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Prev</Text>
      </Pressable>
      <Pressable
        onPress={props.onNext}
        disabled={!props.canGoNext}
        style={{
          minHeight: touch.minSecondary,
          minWidth: 72,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          opacity: props.canGoNext ? 1 : 0.4
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Next</Text>
      </Pressable>
    </View>
  );
}

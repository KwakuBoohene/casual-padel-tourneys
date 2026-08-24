import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface KohLiveActionsProps {
  canEnterResult: boolean;
  ended: boolean;
  onEnterResult: () => void;
  onSwap: () => void;
  onShare: () => void;
  onOpenOptions: () => void;
}

/**
 * Courtside bar: score, swap, share, and everything else behind Options — the same shape as the
 * Americano / Mexicano live screen.
 */
export function KohLiveActions(props: KohLiveActionsProps) {
  const { colors } = useTheme();

  const secondary = (label: string, onPress: () => void, disabled?: boolean) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: touch.minPrimary,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: spacing.xs,
        opacity: disabled ? 0.4 : 1
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
      {!props.ended ? (
        <Pressable
          disabled={!props.canEnterResult}
          onPress={props.onEnterResult}
          style={{
            minHeight: touch.minPrimary,
            borderRadius: radius.lg,
            backgroundColor: props.canEnterResult ? colors.primary : colors.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            opacity: props.canEnterResult ? 1 : 0.5
          }}
        >
          <Text
            style={{
              color: props.canEnterResult ? colors.onPrimary : colors.muted,
              fontWeight: "700",
              fontSize: 17
            }}
          >
            Enter result
          </Text>
        </Pressable>
      ) : (
        <View
          style={{
            minHeight: touch.minSecondary,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.md
          }}
        >
          <Text style={{ color: colors.muted, fontWeight: "600" }}>Night ended · read-only</Text>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {secondary("Swap", props.onSwap, props.ended)}
        {secondary("Share", props.onShare)}
        {secondary("Options", props.onOpenOptions)}
      </View>
    </View>
  );
}

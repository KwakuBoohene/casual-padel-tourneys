import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface KohLiveActionsProps {
  canEnterResult: boolean;
  onEnterResult: () => void;
  onSwap: () => void;
  onRename: () => void;
  onShare: () => void;
  onRank: () => void;
  onBack: () => void;
}

export function KohLiveActions(props: KohLiveActionsProps) {
  const { colors } = useTheme();
  const chip = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: touch.minSecondary,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.sm, paddingBottom: spacing.md }}>
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
      <View style={{ flexDirection: "row", gap: spacing.xs }}>
        {chip("Swap", props.onSwap)}
        {chip("Edit", props.onRename)}
        {chip("Share", props.onShare)}
        {chip("Rank", props.onRank)}
      </View>
      <Pressable onPress={props.onBack} style={{ alignItems: "center", paddingVertical: spacing.sm }}>
        <Text style={{ color: colors.muted, fontWeight: "600" }}>Back to list</Text>
      </Pressable>
    </View>
  );
}

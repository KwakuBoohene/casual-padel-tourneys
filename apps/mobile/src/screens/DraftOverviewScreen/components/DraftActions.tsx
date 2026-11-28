import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface DraftActionsProps {
  formMaxWidth: number;
  ready: boolean;
  blockingReason?: string;
  /** Hidden when draft sharing is off for this deployment. */
  onShare?: () => void;
  onStart: () => void;
}

/** Footer: why Start is disabled, then Share draft + Start tournament (Figma 04). */
export function DraftActions(props: DraftActionsProps) {
  const { colors } = useTheme();
  const button = { minHeight: touch.minPrimary, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" } as const;
  return (
    <View
      style={{
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
        paddingTop: spacing.sm,
        gap: spacing.sm,
        maxWidth: props.formMaxWidth,
        width: "100%",
        alignSelf: "center",
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background
      }}
    >
      {!props.ready && props.blockingReason ? (
        <Text style={{ fontSize: 13, color: colors.statusNext, textAlign: "center" }}>{props.blockingReason}</Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {props.onShare ? (
          <Pressable
            onPress={props.onShare}
            accessibilityRole="button"
            style={[button, { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}>Share draft</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={props.onStart}
          disabled={!props.ready}
          accessibilityRole="button"
          accessibilityState={{ disabled: !props.ready }}
          style={[button, { flex: 1.4, backgroundColor: colors.primary, opacity: props.ready ? 1 : 0.45 }]}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 16 }}>Start tournament</Text>
        </Pressable>
      </View>
    </View>
  );
}

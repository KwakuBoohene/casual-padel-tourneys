import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface EstimatorFooterProps {
  formMaxWidth: number;
  primaryLabel: string;
  onBack: () => void;
  onPrimary: () => void;
}

export function EstimatorFooter(props: EstimatorFooterProps) {
  const { colors } = useTheme();
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
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Pressable
          onPress={props.onBack}
          style={{
            flex: 1,
            minHeight: touch.minPrimary,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>Back</Text>
        </Pressable>
        <Pressable
          onPress={props.onPrimary}
          style={{
            flex: 1.4,
            minHeight: touch.minPrimary,
            borderRadius: radius.lg,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: spacing.sm
          }}
        >
          <Text
            style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 16, textAlign: "center" }}
          >
            {props.primaryLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

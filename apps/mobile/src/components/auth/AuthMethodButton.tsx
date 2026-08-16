import { ActivityIndicator, Pressable, Text } from "react-native";

import { radius, spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface AuthMethodButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
}

export function AuthMethodButton(props: AuthMethodButtonProps) {
  const { colors } = useTheme();
  const primary = props.variant === "primary";
  const busy = Boolean(props.loading);
  const disabled = Boolean(props.disabled) || busy;

  return (
    <Pressable
      disabled={disabled}
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled, busy }}
      style={{
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        backgroundColor: primary
          ? disabled
            ? colors.border
            : colors.primary
          : colors.surface,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm
      }}
    >
      {busy ? (
        <ActivityIndicator color={primary ? colors.onPrimary : colors.text} />
      ) : null}
      <Text
        style={{
          color: primary ? colors.onPrimary : colors.text,
          fontWeight: primary ? "700" : "600"
        }}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

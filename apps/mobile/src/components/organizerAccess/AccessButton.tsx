import { Pressable, Text } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

export function AccessButton({
  label,
  onPress,
  disabled = false,
  secondary = false
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 48,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: secondary ? colors.surface : colors.primary,
        opacity: disabled ? 0.5 : 1
      }}
    >
      <Text style={{ color: secondary ? colors.text : colors.onPrimary, fontWeight: "700", fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

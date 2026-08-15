import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface SettingsStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function SettingsStepper(props: SettingsStepperProps) {
  const { colors } = useTheme();
  const min = props.min ?? 1;
  const max = props.max ?? 99;
  const step = props.step ?? 1;
  const dec = () => props.onChange(Math.max(min, props.value - step));
  const inc = () => props.onChange(Math.min(max, props.value + step));

  const chip = (symbol: string, onPress: () => void, disabled: boolean) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        minWidth: touch.minSecondary,
        minHeight: touch.minSecondary,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : 1
      }}
    >
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>{symbol}</Text>
    </Pressable>
  );

  return (
    <View
      style={{
        minHeight: touch.minSecondary,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingLeft: spacing.md,
        paddingRight: spacing.xs,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm
      }}
    >
      <Text style={{ flex: 1, color: colors.muted, fontSize: 15, fontWeight: "500" }}>{props.label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {chip("−", dec, props.value <= min)}
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", minWidth: 28, textAlign: "center" }}>
          {props.value}
        </Text>
        {chip("+", inc, props.value >= max)}
      </View>
    </View>
  );
}

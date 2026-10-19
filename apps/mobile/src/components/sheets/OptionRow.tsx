import { Pressable, Text } from "react-native";

import { spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

export interface OptionRowProps {
  label: string;
  detail: string;
  onPress: () => void;
  /** Draws the primary border — for the one action the sheet is really about. */
  emphasized?: boolean;
  disabled?: boolean;
}

/** A labelled action inside an options sheet. Shared so every mode's sheet reads the same. */
export function OptionRow(props: OptionRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={{
        minHeight: touch.minPrimary,
        borderRadius: 14,
        borderWidth: props.emphasized ? 2 : 1,
        borderColor: props.emphasized ? colors.primary : colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: 4,
        opacity: props.disabled ? 0.45 : 1
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}>{props.label}</Text>
      <Text style={{ color: colors.muted, fontSize: 13 }}>{props.detail}</Text>
    </Pressable>
  );
}

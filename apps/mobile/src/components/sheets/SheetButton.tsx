import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";

import { createBottomSheetStyles } from "./bottomSheet.styles";

interface SheetButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SheetButton(props: SheetButtonProps) {
  const { colors } = useTheme();
  const styles = createBottomSheetStyles(colors);
  const variant = props.variant ?? "secondary";
  const primary = variant === "primary" || variant === "danger";

  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        primary ? styles.primaryButton : styles.secondaryButton,
        variant === "danger" ? styles.primaryButtonDanger : null,
        props.disabled ? { opacity: 0.45 } : null,
        props.style
      ]}
    >
      <Text style={primary ? styles.primaryButtonLabel : styles.secondaryButtonLabel}>
        {props.label}
      </Text>
    </Pressable>
  );
}

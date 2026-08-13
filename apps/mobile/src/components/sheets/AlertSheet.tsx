import { Pressable, Text, View } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";

import { BottomSheet } from "./BottomSheet";
import { createBottomSheetStyles } from "./bottomSheet.styles";

export type AlertSheetVariant = "info" | "warning" | "error" | "success";

export interface SheetAction {
  label: string;
  onPress: () => void;
  /** Danger-styled primary (e.g. Delete). */
  destructive?: boolean;
}

export interface AlertSheetProps {
  visible: boolean;
  variant: AlertSheetVariant;
  title: string;
  message: string;
  primaryAction: SheetAction;
  secondaryAction?: SheetAction;
  onDismiss: () => void;
  /** Defaults: false for warning/error, true for info/success. */
  dismissOnOverlay?: boolean;
}

const VARIANT_COLOR_KEY: Record<AlertSheetVariant, "primary" | "danger" | "statusNext" | "statusCompleted"> = {
  info: "primary",
  warning: "statusNext",
  error: "danger",
  success: "statusCompleted"
};

export function AlertSheet(props: AlertSheetProps) {
  const { colors } = useTheme();
  const styles = createBottomSheetStyles(colors);
  const dismissOnOverlay =
    props.dismissOnOverlay ?? (props.variant === "info" || props.variant === "success");
  const barColor = colors[VARIANT_COLOR_KEY[props.variant]];

  return (
    <BottomSheet
      visible={props.visible}
      title={props.title}
      onDismiss={props.onDismiss}
      dismissOnOverlay={dismissOnOverlay}
    >
      <View style={[styles.variantBar, { backgroundColor: barColor }]} />
      <Text style={styles.body}>{props.message}</Text>
      <View style={props.secondaryAction ? styles.actionsRow : styles.actionsColumn}>
        {props.secondaryAction ? (
          <Pressable
            onPress={props.secondaryAction.onPress}
            style={[styles.secondaryButton, { flex: 1 }]}
          >
            <Text style={styles.secondaryButtonLabel}>{props.secondaryAction.label}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={props.primaryAction.onPress}
          style={[
            styles.primaryButton,
            props.primaryAction.destructive || props.variant === "error"
              ? styles.primaryButtonDanger
              : null,
            props.secondaryAction ? { flex: 1 } : null
          ]}
        >
          <Text style={styles.primaryButtonLabel}>{props.primaryAction.label}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { useBreakpoint } from "../../layout";
import { useTheme } from "../../theme/ThemeProvider";

import { createBottomSheetStyles } from "./bottomSheet.styles";

export interface BottomSheetProps {
  visible: boolean;
  title?: string;
  children: ReactNode;
  onDismiss: () => void;
  /** When false, overlay / hardware back do not dismiss (destructive confirms). */
  dismissOnOverlay?: boolean;
  /** Optional max width override; defaults to formMaxWidth. */
  maxWidth?: number;
}

export function BottomSheet(props: BottomSheetProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const styles = createBottomSheetStyles(colors);
  const dismissOnOverlay = props.dismissOnOverlay !== false;
  const maxWidth = props.maxWidth ?? formMaxWidth;

  return (
    <Modal
      transparent
      visible={props.visible}
      animationType="slide"
      onRequestClose={dismissOnOverlay ? props.onDismiss : undefined}
    >
      <Pressable
        style={styles.overlay}
        onPress={dismissOnOverlay ? props.onDismiss : undefined}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[styles.sheet, { maxWidth }]}
        >
          <View style={styles.handle} />
          {props.title ? <Text style={styles.title}>{props.title}</Text> : null}
          {props.children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

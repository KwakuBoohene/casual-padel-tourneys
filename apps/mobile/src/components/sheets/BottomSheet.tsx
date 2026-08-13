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
      {/*
        Overlay is a View + absolute Pressable so Space in TextInputs (Expo web)
        does not activate a focused button role and dismiss the sheet.
      */}
      <View style={styles.overlay}>
        <Pressable
          style={styles.overlayDismissHit}
          onPress={dismissOnOverlay ? props.onDismiss : undefined}
          accessible={false}
          importantForAccessibility="no"
        />
        <View style={[styles.sheet, { maxWidth }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          {props.title ? <Text style={styles.title}>{props.title}</Text> : null}
          {props.children}
        </View>
      </View>
    </Modal>
  );
}

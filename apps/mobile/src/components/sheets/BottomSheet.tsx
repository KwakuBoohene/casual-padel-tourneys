import type { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

import { useBreakpoint } from "../../layout";
import { useTheme } from "../../theme/ThemeProvider";

import { createBottomSheetStyles } from "./bottomSheet.styles";
import { useBottomSheetMotion } from "./useBottomSheetMotion";

export interface BottomSheetProps {
  visible: boolean;
  title?: string;
  children: ReactNode;
  onDismiss: () => void;
  /** When false, overlay / hardware back / pan do not dismiss (destructive confirms). */
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

  const motion = useBottomSheetMotion({
    visible: props.visible,
    enablePanDismiss: dismissOnOverlay,
    onDismiss: props.onDismiss
  });

  if (!motion.mounted) {
    return null;
  }

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={dismissOnOverlay ? () => motion.dismissAnimated() : undefined}
    >
      {/*
        Overlay is a View + absolute Pressable so Space in TextInputs (Expo web)
        does not activate a focused button role and dismiss the sheet.
      */}
      <View style={styles.overlay}>
        <Animated.View pointerEvents="none" style={[styles.overlayScrim, motion.overlayStyle]} />
        <Pressable
          style={styles.overlayDismissHit}
          onPress={dismissOnOverlay ? () => motion.dismissAnimated() : undefined}
          accessible={false}
          importantForAccessibility="no"
        />
        <Animated.View style={[styles.sheet, { maxWidth }, motion.sheetStyle]} accessibilityViewIsModal>
          <GestureDetector gesture={motion.panGesture}>
            <Animated.View style={styles.dragRegion}>
              <View style={styles.handle} />
              {props.title ? <Text style={styles.title}>{props.title}</Text> : null}
            </Animated.View>
          </GestureDetector>
          {props.children}
        </Animated.View>
      </View>
    </Modal>
  );
}

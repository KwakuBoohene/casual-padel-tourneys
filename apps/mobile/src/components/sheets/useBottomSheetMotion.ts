import { useEffect, useEffectEvent, useState } from "react";
import { Dimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;
const OPEN_SPRING = { damping: 22, stiffness: 220, mass: 0.9 };
const CLOSE_MS = 220;
const CLOSE_TIMING = { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) };

export function useBottomSheetMotion(input: {
  visible: boolean;
  enablePanDismiss: boolean;
  onDismiss: () => void;
}) {
  const [mounted, setMounted] = useState(input.visible);
  const [shownVisible, setShownVisible] = useState(input.visible);
  const closing = useSharedValue(false);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  // Counts user-initiated dismissals; the parent is told after commit, with its latest callback.
  const [dismissals, setDismissals] = useState(0);
  const notifyDismiss = useEffectEvent(() => input.onDismiss());
  useEffect(() => {
    if (dismissals > 0) notifyDismiss();
  }, [dismissals]);

  // Opening mounts the sheet in the same render; closing unmounts only after the exit animation.
  if (input.visible !== shownVisible) {
    setShownVisible(input.visible);
    if (input.visible) setMounted(true);
  }

  const finishClose = (thenDismiss: boolean) => {
    closing.set(false);
    setMounted(false);
    if (thenDismiss) setDismissals((count) => count + 1);
  };

  const animateClosed = (thenDismiss: boolean) => {
    "worklet";
    overlayOpacity.set(withTiming(0, { duration: CLOSE_MS }));
    translateY.set(
      withTiming(SCREEN_HEIGHT, CLOSE_TIMING, (finished?: boolean) => {
        if (finished) runOnJS(finishClose)(thenDismiss);
      })
    );
  };

  const beginClose = (thenDismiss: boolean) => {
    if (closing.get()) return;
    closing.set(true);
    animateClosed(thenDismiss);
  };

  useEffect(() => {
    if (input.visible) {
      closing.set(false);
      translateY.set(SCREEN_HEIGHT);
      overlayOpacity.set(0);
      translateY.set(withSpring(0, OPEN_SPRING));
      overlayOpacity.set(withTiming(1, { duration: 180 }));
      return;
    }
    if (mounted && !closing.get()) {
      beginClose(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drive open/close from visible
  }, [input.visible]);

  const panGesture = Gesture.Pan()
    .enabled(input.enablePanDismiss)
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onBegin(() => {
      dragStartY.set(translateY.get());
    })
    .onUpdate((event) => {
      const next = Math.max(0, dragStartY.get() + event.translationY);
      translateY.set(next);
      overlayOpacity.set(1 - Math.min(1, next / SCREEN_HEIGHT) * 0.7);
    })
    .onEnd((event) => {
      const shouldDismiss =
        event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;
      if (shouldDismiss) {
        runOnJS(beginClose)(true);
        return;
      }
      translateY.set(withSpring(0, OPEN_SPRING));
      overlayOpacity.set(withTiming(1, { duration: 160 }));
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }]
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.get()
  }));

  return {
    mounted,
    panGesture,
    sheetStyle,
    overlayStyle,
    dismissAnimated: () => beginClose(true)
  };
}

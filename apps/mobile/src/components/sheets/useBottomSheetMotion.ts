import { useEffect, useRef, useState } from "react";
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

export function useBottomSheetMotion(input: {
  visible: boolean;
  enablePanDismiss: boolean;
  onDismiss: () => void;
}) {
  const [mounted, setMounted] = useState(input.visible);
  const closingRef = useRef(false);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const onDismissRef = useRef(input.onDismiss);
  onDismissRef.current = input.onDismiss;

  const finishClose = (thenDismiss: boolean) => {
    closingRef.current = false;
    setMounted(false);
    if (thenDismiss) {
      onDismissRef.current();
    }
  };

  const animateClosed = (thenDismiss: boolean) => {
    "worklet";
    overlayOpacity.value = withTiming(0, { duration: CLOSE_MS });
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(finishClose)(thenDismiss);
        }
      }
    );
  };

  const beginClose = (thenDismiss: boolean) => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    animateClosed(thenDismiss);
  };

  useEffect(() => {
    if (input.visible) {
      closingRef.current = false;
      setMounted(true);
      translateY.value = SCREEN_HEIGHT;
      overlayOpacity.value = 0;
      translateY.value = withSpring(0, OPEN_SPRING);
      overlayOpacity.value = withTiming(1, { duration: 180 });
      return;
    }
    if (mounted && !closingRef.current) {
      beginClose(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drive open/close from visible
  }, [input.visible]);

  const panGesture = Gesture.Pan()
    .enabled(input.enablePanDismiss)
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onBegin(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = Math.max(0, dragStartY.value + event.translationY);
      translateY.value = next;
      overlayOpacity.value = 1 - Math.min(1, next / SCREEN_HEIGHT) * 0.7;
    })
    .onEnd((event) => {
      const shouldDismiss =
        event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;
      if (shouldDismiss) {
        runOnJS(beginClose)(true);
        return;
      }
      translateY.value = withSpring(0, OPEN_SPRING);
      overlayOpacity.value = withTiming(1, { duration: 160 });
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value
  }));

  return {
    mounted,
    panGesture,
    sheetStyle,
    overlayStyle,
    dismissAnimated: () => beginClose(true)
  };
}

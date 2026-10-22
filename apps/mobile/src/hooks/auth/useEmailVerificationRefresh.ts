import { useCallback } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

import { useAuthSessionContext } from "../../providers/AuthSessionProvider";

/** Reconcile cached verification while a screen that requires verified email is visible. */
export function useEmailVerificationRefresh() {
  const { authToken, currentUser, emailVerifyRequired, refreshUser } = useAuthSessionContext();
  const enabled = Boolean(
    authToken && currentUser && !currentUser.isGuest && (!currentUser.emailVerified || emailVerifyRequired)
  );
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let checking = false;
      const check = async () => {
        if (checking || AppState.currentState === "background") return;
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        checking = true;
        try {
          await refreshUser();
        } catch {
          // Transient network failures leave the existing session intact; retry on focus/next tick.
        } finally {
          checking = false;
        }
      };
      const onFocus = () => void check();
      onFocus();
      const timer = setInterval(onFocus, 10_000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") onFocus();
      });
      if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", onFocus);
      return () => {
        clearInterval(timer);
        subscription.remove();
        if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
        if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onFocus);
      };
    }, [enabled, refreshUser])
  );
}

import { useUsageConsent } from "./useUsageConsent";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { usageRoute } from "@padel/shared";
import { usePathname } from "expo-router";
import { useAuthSessionContext } from "../../providers/AuthSessionProvider";
import { sendUsageVisits } from "../../api/usage";
import { VisitClient } from "../../utilities/usage/VisitClient";

const sessionKey = "padel-organizer-usage-session-v1";
export function useUsageVisits() {
  const enabled = (process.env.EXPO_PUBLIC_USAGE_VISITS_ENABLED ?? "true") === "true";
  const ga4Enabled = Platform.OS === "web" && process.env.EXPO_PUBLIC_ORGANIZER_GA4_ENABLED === "true";
  const pathname = usePathname();
  const { authToken, currentUser } = useAuthSessionContext();
  const actorId = currentUser?.id;
  const { consent, setConsent, live: liveRef } = useUsageConsent(enabled || ga4Enabled);
  useEffect(() => {
    if (!enabled || !consent || !authToken || !actorId) return;
    const browser = Platform.OS === "web";
    const visible = () =>
      browser ? document.visibilityState === "visible" : AppState.currentState === "active";
    let serial = Promise.resolve();
    const instance = new VisitClient(
      {
        read: () => AsyncStorage.getItem(sessionKey),
        write: (value) =>
          value ? AsyncStorage.setItem(sessionKey, value) : AsyncStorage.removeItem(sessionKey),
        uuid: randomUUID,
        visible,
        send: (events, signal) => sendUsageVisits(authToken, events, signal),
        lock: async (work) => {
          if (browser) {
            if (navigator.locks) await navigator.locks.request(sessionKey, work);
          } else {
            serial = serial.then(work, work);
            await serial;
          }
        }
      },
      actorId
    );
    liveRef.current = instance;
    const hide = () => {
      if (!visible()) instance.pause();
    };
    const listener = AppState.addEventListener("change", hide);
    if (browser) document.addEventListener("visibilitychange", hide);
    return () => {
      instance.stop();
      listener.remove();
      if (browser) document.removeEventListener("visibilitychange", hide);
    };
  }, [enabled, consent, authToken, actorId, liveRef]);
  // Runs after the effect above, so it tracks with the client created for the current consent and actor.
  useEffect(() => {
    const client = liveRef.current;
    if (!client || !consent) return;
    const route = usageRoute(pathname);
    if (!route) {
      client.pause();
      return;
    }
    const track = () => {
      void client.visit(route);
    };
    track();
    const listener = AppState.addEventListener("change", track);
    if (Platform.OS === "web") {
      window.addEventListener("pointerdown", track);
      window.addEventListener("keydown", track);
      window.addEventListener("focus", track);
      document.addEventListener("visibilitychange", track);
    }
    return () => {
      listener.remove();
      if (Platform.OS === "web") {
        window.removeEventListener("pointerdown", track);
        window.removeEventListener("keydown", track);
        window.removeEventListener("focus", track);
        document.removeEventListener("visibilitychange", track);
      }
    };
  }, [enabled, consent, authToken, actorId, pathname, liveRef]);
  function choose(value: boolean) {
    if (!value) liveRef.current?.stop();
    setConsent(value);
    void AsyncStorage.setItem("padel-organizer-usage-consent-v1", value ? "yes" : "no").catch(() => {
      setConsent(false);
      liveRef.current?.stop();
    });
    if (!value) void AsyncStorage.removeItem(sessionKey).catch(() => {});
  }
  return {
    enabled: (enabled || ga4Enabled) && Boolean(authToken && currentUser),
    consent,
    choose,
    track: () => {
      const route = usageRoute(pathname);
      const client = liveRef.current;
      if (client && consent && route) void client.visit(route);
    }
  };
}

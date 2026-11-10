import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VisitClient } from "../../utilities/usage/VisitClient";
const consentKey = "padel-organizer-usage-consent-v1";
export function useUsageConsent(enabled: boolean) {
  const [consent, setConsent] = useState<boolean | null>(null);
  const generation = useRef(0);
  const choose = useCallback((value: boolean) => {
    generation.current++;
    setConsent(value);
  }, []);
  const live = useRef<VisitClient | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = () => {
      const current = ++generation.current;
      void AsyncStorage.getItem(consentKey)
        .then((value: string | null) => {
          if (active && current === generation.current) {
            const allowed = value === null || value === "yes";
            if (!allowed) live.current?.stop();
            setConsent(allowed);
          }
        })
        .catch(() => {
          if (active && current === generation.current) {
            live.current?.stop();
            setConsent(false);
          }
        });
    };
    load();
    if (Platform.OS === "web") window.addEventListener("storage", load);
    return () => {
      active = false;
      if (Platform.OS === "web") window.removeEventListener("storage", load);
    };
  }, [enabled]);

  return { consent, setConsent: choose, live };
}

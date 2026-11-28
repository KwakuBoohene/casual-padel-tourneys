import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

/**
 * Run `flush` whenever the wizard may be about to disappear with edits still inside the
 * autosave delay: the app is backgrounded, the tab is hidden, closed or reloaded, or the
 * screen unmounts (browser back, deep link, sign-out).
 */
export function useDraftFlush(flush: () => void): void {
  const latest = useRef(flush);
  useEffect(() => {
    latest.current = flush;
  }, [flush]);

  useEffect(() => {
    const run = () => latest.current();
    // On web this is `visibilitychange`, so it also covers switching tabs.
    const appState = AppState.addEventListener("change", (state) => {
      if (state !== "active") run();
    });
    const web = Platform.OS === "web" && typeof window !== "undefined";
    if (web) window.addEventListener("pagehide", run);
    return () => {
      appState.remove();
      if (web) window.removeEventListener("pagehide", run);
      run();
    };
  }, []);
}

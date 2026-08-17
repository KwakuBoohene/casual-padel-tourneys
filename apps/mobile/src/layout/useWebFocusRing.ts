import { useEffect } from "react";
import { Platform } from "react-native";

const STYLE_ID = "padel-web-focus-ring";

/** Hide the browser focus outline on Expo web TextInputs. */
export function useWebFocusRing(): void {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      input, textarea, select,
      input:focus, textarea:focus, select:focus,
      input:focus-visible, textarea:focus-visible, select:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
  }, []);
}

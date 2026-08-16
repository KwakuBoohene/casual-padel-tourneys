import { useEffect } from "react";
import { Platform } from "react-native";

/** Keep html/body/#root painted with the theme background on Expo web. */
export function useWebDocumentBackground(backgroundColor: string): void {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const targets = [document.documentElement, document.body, document.getElementById("root")].filter(
      (node): node is HTMLElement => Boolean(node)
    );

    const previous = targets.map((el) => el.style.backgroundColor);
    for (const el of targets) {
      el.style.backgroundColor = backgroundColor;
      el.style.minHeight = "100%";
    }
    if (document.documentElement) {
      document.documentElement.style.height = "100%";
    }
    if (document.body) {
      document.body.style.height = "100%";
      document.body.style.margin = "0";
    }

    return () => {
      targets.forEach((el, index) => {
        el.style.backgroundColor = previous[index] ?? "";
      });
    };
  }, [backgroundColor]);
}

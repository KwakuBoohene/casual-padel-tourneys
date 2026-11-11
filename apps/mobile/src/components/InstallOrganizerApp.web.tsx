import {
  isWebAppInstalled,
  requestWebInstall,
  subscribeToWebInstall,
  webInstallBrowserHint,
  webInstallInstructions
} from "@padel/shared/webInstall";
import { useId, useRef, useSyncExternalStore } from "react";
import { Pressable, Text } from "react-native";

import { spacing } from "../theme";
import { useTheme } from "../theme/ThemeProvider";

export function InstallOrganizerApp({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const installed = useSyncExternalStore(subscribeToWebInstall, isWebAppInstalled);
  if (installed) return null;

  async function handleInstall() {
    if (!(await requestWebInstall())) dialog.current?.showModal();
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={handleInstall}
        style={{ minHeight: 44, paddingHorizontal: compact ? 4 : spacing.md, justifyContent: "center", flexShrink: 0 }}
      >
        <Text numberOfLines={1} style={{ color: colors.primary, fontWeight: "700", fontSize: compact ? 12 : undefined }}>Install app</Text>
      </Pressable>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        style={{
          boxSizing: "border-box",
          width: "min(calc(100% - 32px), 448px)",
          maxHeight: "calc(100% - 32px)",
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 20,
          background: colors.surface,
          color: colors.text,
          font: "14px/1.5 system-ui, sans-serif"
        }}
      >
        <h2 id={titleId} style={{ fontSize: 18, margin: 0 }}>Install Casual Tourneys</h2>
        {webInstallInstructions(navigator).map((step) => <p key={step}>{step}</p>)}
        <p style={{ color: colors.muted }}>{webInstallBrowserHint}</p>
        <form method="dialog" style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            style={{
              minHeight: 44,
              padding: "0 16px",
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              background: colors.surfaceAlt,
              color: colors.text,
              cursor: "pointer"
            }}
          >
            Done
          </button>
        </form>
      </dialog>
    </>
  );
}

import type { PadelColors } from "@padel/shared/theme";
import { StyleSheet } from "react-native";

import { overlay, radius, spacing, touch } from "../../theme";

export function createBottomSheetStyles(colors: PadelColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: overlay.dim,
      justifyContent: "flex-end"
    },
    overlayDismissHit: {
      ...StyleSheet.absoluteFillObject
    },
    sheet: {
      backgroundColor: colors.surfaceAlt,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.md,
      width: "100%",
      alignSelf: "center",
      zIndex: 1
    },
    handle: {
      alignSelf: "center",
      width: touch.sheetHandleWidth,
      height: touch.sheetHandleHeight,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
      marginBottom: spacing.xs
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text
    },
    body: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 22
    },
    actionsColumn: {
      gap: spacing.sm,
      marginTop: spacing.xs
    },
    actionsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.xs
    },
    primaryButton: {
      minHeight: touch.minPrimary,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center"
    },
    primaryButtonDanger: {
      backgroundColor: colors.danger
    },
    primaryButtonLabel: {
      color: colors.onPrimary,
      fontWeight: "700",
      fontSize: 16
    },
    secondaryButton: {
      minHeight: touch.minSecondary,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center"
    },
    secondaryButtonLabel: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 15
    },
    variantBar: {
      height: 3,
      borderRadius: radius.pill,
      alignSelf: "stretch"
    }
  });
}

export type BottomSheetStyles = ReturnType<typeof createBottomSheetStyles>;

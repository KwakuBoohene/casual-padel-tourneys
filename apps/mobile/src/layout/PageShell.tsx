import type { ReactNode } from "react";
import { View } from "react-native";

import { colors } from "../theme";
import { useBreakpoint } from "./useBreakpoint";

interface PageShellProps {
  children: ReactNode;
}

/**
 * Constrains content width on large viewports so Expo web does not stretch edge-to-edge.
 */
export function PageShell({ children }: PageShellProps) {
  const { shellMaxWidth, shellPaddingHorizontal } = useBreakpoint();

  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        alignItems: "center",
        backgroundColor: colors.background
      }}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: shellMaxWidth,
          paddingHorizontal: shellPaddingHorizontal
        }}
      >
        {children}
      </View>
    </View>
  );
}

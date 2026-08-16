import type { ReactNode } from "react";
import { View } from "react-native";

import { useTheme } from "../theme/ThemeProvider";
import { useBreakpoint } from "./useBreakpoint";

interface PageShellProps {
  children: ReactNode;
}

/**
 * Constrains content width on large viewports so Expo web does not stretch edge-to-edge.
 * Full-bleed background stays on the outer flex:1 view.
 */
export function PageShell({ children }: PageShellProps) {
  const { shellMaxWidth, shellPaddingHorizontal } = useBreakpoint();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, width: "100%", backgroundColor: colors.background }}>
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: shellMaxWidth,
          alignSelf: "center",
          paddingHorizontal: shellPaddingHorizontal
        }}
      >
        {children}
      </View>
    </View>
  );
}

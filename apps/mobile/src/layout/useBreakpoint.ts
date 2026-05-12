import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { layoutTokens } from "./layoutTokens";

export interface BreakpointState {
  width: number;
  height: number;
  isCompact: boolean;
  isMedium: boolean;
  isWide: boolean;
  /** Max width for form-style columns */
  formMaxWidth: number;
  shellMaxWidth: number;
  shellPaddingHorizontal: number;
}

export function useBreakpoint(): BreakpointState {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isCompact = width < layoutTokens.breakpointMedium;
    const isMedium =
      width >= layoutTokens.breakpointMedium && width < layoutTokens.breakpointWide;
    const isWide = width >= layoutTokens.breakpointWide;

    const formMaxWidth = isWide
      ? layoutTokens.formMaxWide
      : isMedium
        ? layoutTokens.formMaxMedium
        : layoutTokens.formMaxCompact;

    const shellPaddingHorizontal = isWide
      ? layoutTokens.shellPaddingWide
      : layoutTokens.shellPaddingCompact;

    return {
      width,
      height,
      isCompact,
      isMedium,
      isWide,
      formMaxWidth,
      shellMaxWidth: layoutTokens.shellMaxWidth,
      shellPaddingHorizontal
    };
  }, [width, height]);
}

/** Width breakpoints (align with common CSS habits). */
export const layoutTokens = {
  breakpointMedium: 768,
  breakpointWide: 1024,
  /** Outer app column on large viewports */
  shellMaxWidth: 1200,
  shellPaddingCompact: 16,
  shellPaddingWide: 24,
  /** Primary form / wizard column */
  formMaxCompact: 420,
  formMaxMedium: 520,
  formMaxWide: 640,
  /** Live tournament sidebar on wide layouts */
  liveSidebarMinWidth: 280,
  liveSidebarMaxWidth: 380
} as const;

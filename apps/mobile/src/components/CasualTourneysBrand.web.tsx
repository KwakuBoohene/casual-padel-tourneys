import { useTheme } from "../theme/ThemeProvider";

export function CasualTourneysBrand({ fontSize = 15 }: { fontSize?: number }) {
  const { colors } = useTheme();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9, minWidth: 0, flexShrink: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: colors.text }}>
      <svg width="22" height="28" viewBox="0 0 22 28" fill="none" aria-hidden="true" style={{ color: colors.primary, flexShrink: 0 }}>
        <rect x="1" y="1" width="20" height="17" rx="6" stroke="currentColor" strokeWidth="2" />
        <line x1="7.5" y1="1" x2="7.5" y2="18" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.65" />
        <line x1="11" y1="1" x2="11" y2="18" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.65" />
        <line x1="14.5" y1="1" x2="14.5" y2="18" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.65" />
        <line x1="1" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.65" />
        <line x1="1" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.65" />
        <path d="M8.5 18 L8 26 Q11 27.5 14 26 L13.5 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontWeight: 700, fontSize, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Casual Tourneys</span>
    </span>
  );
}

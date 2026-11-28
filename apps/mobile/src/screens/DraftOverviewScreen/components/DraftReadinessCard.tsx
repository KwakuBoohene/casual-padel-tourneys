import { Text, View } from "react-native";
import type { DraftReadiness } from "@padel/shared";

import { radius, spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface DraftReadinessCardProps {
  readiness: DraftReadiness;
}

/** "Ready to start" / "n things left" checklist from the shared readiness check (Figma 04). */
export function DraftReadinessCard({ readiness }: DraftReadinessCardProps) {
  const { colors } = useTheme();
  const missing = readiness.items.filter((item) => item.status === "missing");
  const accent = readiness.ready ? colors.statusCompleted : colors.statusNext;
  const title = readiness.ready
    ? "Ready to start"
    : `${missing.length} ${missing.length === 1 ? "thing" : "things"} left before you can start`;

  return (
    <View
      accessibilityRole="summary"
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: accent,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.xs
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: "700", color: accent }}>{title}</Text>
      {readiness.items.map((item) => (
        <Text key={item.key} style={{ fontSize: 14, color: item.status === "ok" ? colors.muted : colors.text }}>
          {item.status === "ok" ? "✓" : "○"} {item.label}
        </Text>
      ))}
    </View>
  );
}

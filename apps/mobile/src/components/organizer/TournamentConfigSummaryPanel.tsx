import { Text, View } from "react-native";

import { spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import type { ConfigSummaryRow } from "../../utilities/organizer/tournamentConfigSummary";

interface TournamentConfigSummaryPanelProps {
  title?: string;
  rows: ConfigSummaryRow[];
}

export function TournamentConfigSummaryPanel(props: TournamentConfigSummaryPanelProps) {
  const { colors } = useTheme();

  if (props.rows.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.sm
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
        {props.title ?? "Event settings"}
      </Text>
      {props.rows.map((row) => (
        <View
          key={row.label}
          style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}
        >
          <Text style={{ color: colors.muted, fontSize: 14, flex: 1 }}>{row.label}</Text>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" }}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

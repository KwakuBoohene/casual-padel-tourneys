import { Pressable, ScrollView, Text, View } from "react-native";

import { spacing, touch, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { formatKohUnitLabel } from "../../../utilities/koh/rankingFormat";
import type { KohEditUnitRow } from "../../../utilities/koh/editPlayersList";

interface KohEditPlayersPanelProps {
  rows: KohEditUnitRow[];
  errorText: string;
  onSelect: (row: KohEditUnitRow) => void;
  onBack: () => void;
}

export function KohEditPlayersPanel(props: KohEditPlayersPanelProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
        <Text style={[typography.title, { color: colors.text }]}>Edit players</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Fix a spelling or replace a partner who left. Unit slot and match record stay.
        </Text>
        {props.errorText ? <Text style={{ color: colors.danger }}>{props.errorText}</Text> : null}
        {props.rows.map((row) => {
          const wl = `${row.unit.matchesWon ?? 0}-${row.unit.matchesLost ?? 0}`;
          return (
            <Pressable
              key={row.unit.id}
              onPress={() => props.onSelect(row)}
              style={{
                minHeight: touch.minPrimary,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                padding: spacing.lg,
                gap: 4
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>
                {formatKohUnitLabel(row.unit.playerAName, row.unit.playerBName)}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Court {row.courtNumber} · {row.role} · {wl}
                {row.midMatch ? " · mid-match" : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        onPress={props.onBack}
        style={{ alignItems: "center", padding: spacing.xl, minHeight: touch.minSecondary }}
      >
        <Text style={{ color: colors.muted, fontWeight: "600" }}>Back</Text>
      </Pressable>
    </View>
  );
}

import { Pressable, ScrollView, Text, View } from "react-native";
import type { KohRankingRow } from "@padel/shared";

import { radius, spacing, touch, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { formatKohRankingStats, formatKohUnitLabel } from "../../../utilities/koh/rankingFormat";

function RankingRowCard(props: { row: KohRankingRow }) {
  const { colors } = useTheme();
  const weakest = Boolean(props.row.weakest);
  return (
    <View
      style={{
        minHeight: touch.minPrimary,
        borderRadius: radius.lg,
        borderWidth: weakest ? 2 : 1,
        borderColor: weakest ? colors.primary : colors.border,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md
      }}
    >
      <Text style={{ color: colors.muted, fontWeight: "700", width: 28 }}>{props.row.rank}</Text>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>
          {formatKohUnitLabel(props.row.playerAName, props.row.playerBName)}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{formatKohRankingStats(props.row)}</Text>
      </View>
      {weakest ? (
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>weakest</Text>
      ) : null}
    </View>
  );
}

interface KohRankingsPanelProps {
  courtNumber: number;
  scope: "court" | "all";
  onScope: (scope: "court" | "all") => void;
  rows: KohRankingRow[];
  loading: boolean;
  errorText: string;
  onHowRanking: () => void;
  onBack: () => void;
}

export function KohRankingsPanel(props: KohRankingsPanelProps) {
  const { colors } = useTheme();
  const tab = (label: string, value: "court" | "all") => {
    const active = props.scope === value;
    return (
      <Pressable
        onPress={() => props.onScope(value)}
        style={{
          flex: 1,
          minHeight: touch.minSecondary,
          borderRadius: radius.pill,
          backgroundColor: active ? colors.primary : colors.surface,
          borderWidth: active ? 0 : 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: active ? colors.onPrimary : colors.text, fontWeight: "700" }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <Text style={[typography.title, { color: colors.text }]}>Rankings</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {tab(`Court ${props.courtNumber}`, "court")}
          {tab("All courts", "all")}
        </View>
        {props.loading ? <Text style={{ color: colors.muted }}>Loading…</Text> : null}
        {props.errorText ? <Text style={{ color: colors.danger }}>{props.errorText}</Text> : null}
        {props.rows.map((row) => (
          <RankingRowCard key={row.unitId} row={row} />
        ))}
        {!props.loading && props.rows.length === 0 ? (
          <Text style={{ color: colors.muted }}>No units on the board yet.</Text>
        ) : null}
      </ScrollView>
      <View style={{ padding: spacing.xl, gap: spacing.sm }}>
        <Pressable
          onPress={props.onHowRanking}
          style={{
            minHeight: touch.minSecondary,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>How ranking works</Text>
        </Pressable>
        <Pressable onPress={props.onBack} style={{ alignItems: "center", paddingVertical: spacing.sm }}>
          <Text style={{ color: colors.muted, fontWeight: "600" }}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

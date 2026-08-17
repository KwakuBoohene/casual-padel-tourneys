import { Pressable, ScrollView, Text, View } from "react-native";
import type { OrganizerPlayerLeaderboardRow, OrganizerPlayerRange } from "@padel/shared";

import { radius, spacing, touch, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

const RANGES: { id: OrganizerPlayerRange; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" }
];

interface AccountPlayersPanelProps {
  range: OrganizerPlayerRange;
  onRange: (range: OrganizerPlayerRange) => void;
  rows: OrganizerPlayerLeaderboardRow[];
  loading: boolean;
  guestMessage: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
  onAttach?: () => void;
}

export function AccountPlayersPanel(props: AccountPlayersPanelProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <Text style={[typography.title, { color: colors.text }]}>Players</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Your account · KOH games across events
        </Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {RANGES.map((entry) => {
            const active = props.range === entry.id;
            return (
              <Pressable
                key={entry.id}
                onPress={() => props.onRange(entry.id)}
                style={{
                  flex: 1,
                  minHeight: touch.minSecondary,
                  borderRadius: radius.pill,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? colors.primary : colors.border,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: active ? colors.primary : colors.text, fontWeight: "700" }}>
                  {entry.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {props.guestMessage ? (
          <View
            style={{
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              gap: spacing.sm
            }}
          >
            <Text style={{ color: colors.text, lineHeight: 20 }}>{props.guestMessage}</Text>
            {props.onAttach ? (
              <Pressable
                onPress={props.onAttach}
                style={{
                  minHeight: touch.minSecondary,
                  borderRadius: radius.lg,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Attach account</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {props.loading ? <Text style={{ color: colors.muted }}>Loading…</Text> : null}
        {!props.loading && !props.guestMessage && props.rows.length === 0 ? (
          <Text style={{ color: colors.muted }}>No scored KOH games yet in this range.</Text>
        ) : null}
        {props.rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => props.onSelect(row.id)}
            style={{
              minHeight: touch.minPrimary,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: spacing.lg,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md
            }}
          >
            <Text style={{ color: colors.muted, fontWeight: "700", width: 28 }}>{row.rank}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>{row.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                {row.gamesWon} games won · {row.matchesWon} matches
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontWeight: "700" }}>›</Text>
          </Pressable>
        ))}
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

import { Pressable, ScrollView, Text, View } from "react-native";
import {
  standingsLineFromRecord,
  type OrganizerPlayerLeaderboardRow,
  type OrganizerPlayerRange
} from "@padel/shared";

import { radius, spacing, touch, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { StandingsHelpControl } from "../standings/StandingsHelpControl";
import { StandingsTable } from "../standings/StandingsTable";

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Text style={[typography.title, { color: colors.text, flex: 1 }]}>Account Leaderboard</Text>
          <StandingsHelpControl />
        </View>
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
          <Text style={{ color: colors.muted }}>No scored matches yet in this range.</Text>
        ) : null}
        {props.rows.length > 0 ? (
          <StandingsTable
            rows={props.rows.map((row) => ({
              id: row.id,
              rank: row.rank,
              name: row.name,
              line: standingsLineFromRecord({
                wins: row.matchesWon,
                losses: row.matchesLost,
                draws: row.matchesDrawn,
                gamesWon: row.gamesWon,
                gamesLost: row.gamesLost,
                americanoPointsWon: row.americanoPointsWon,
                americanoPointsLost: row.americanoPointsLost
              })
            }))}
            onSelect={props.onSelect}
          />
        ) : null}
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

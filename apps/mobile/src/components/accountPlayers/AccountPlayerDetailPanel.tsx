import { Pressable, ScrollView, Text, View } from "react-native";
import {
  formatGameDiff,
  standingsLineFromRecord,
  type OrganizerPlayerDetail,
  type OrganizerPlayerRange
} from "@padel/shared";

import { spacing, touch, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { StandingsTable } from "../standings/StandingsTable";

function rangeLabel(range: OrganizerPlayerRange): string {
  if (range === "month") return "This month";
  if (range === "year") return `This year · ${new Date().getUTCFullYear()}`;
  return "All time";
}

interface AccountPlayerDetailPanelProps {
  detail: OrganizerPlayerDetail;
  onBack: () => void;
}

export function AccountPlayerDetailPanel(props: AccountPlayerDetailPanelProps) {
  const { colors } = useTheme();
  const detail = props.detail;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
        <Pressable onPress={props.onBack} style={{ minHeight: touch.minSecondary, justifyContent: "center" }}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>← Account Leaderboard</Text>
        </Pressable>
        <Text style={[typography.title, { color: colors.text }]}>{detail.name}</Text>
        <Text style={{ color: colors.muted }}>{rangeLabel(detail.range)}</Text>
        <StandingsTable
          rows={[
            {
              id: detail.id,
              rank: 1,
              name: detail.name,
              line: standingsLineFromRecord({
                wins: detail.matchesWon,
                losses: detail.matchesLost,
                draws: detail.matchesDrawn,
                gamesWon: detail.gamesWon,
                gamesLost: detail.gamesLost
              })
            }
          ]}
        />
        <View
          style={{
            flexDirection: "row",
            gap: spacing.md
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>
            PW(A) {detail.americanoPointsWon}
          </Text>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16 }}>
            PL(A) {detail.americanoPointsLost}
          </Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          PW(A) / PL(A) are Americano rally points, not regular games.
        </Text>
        <Text style={{ color: colors.muted }}>
          {detail.eventsPlayed} {detail.eventsPlayed === 1 ? "event" : "events"} played
        </Text>
        <Text style={[typography.sectionTitle, { color: colors.text, marginTop: spacing.sm }]}>
          Recent events
        </Text>
        {detail.recentEvents.length === 0 ? (
          <Text style={{ color: colors.muted }}>No events in this range.</Text>
        ) : (
          detail.recentEvents.map((event) => (
            <Text key={event.tournamentId} style={{ color: colors.text, lineHeight: 22 }}>
              {event.tournamentName} · {event.matchesWon}–{event.matchesLost}
              {event.americanoPointsWon + event.americanoPointsLost > 0
                ? ` · PW(A) ${event.americanoPointsWon} PL(A) ${event.americanoPointsLost}`
                : ` · GD ${formatGameDiff(event.gamesWon - event.gamesLost)}`}
            </Text>
          ))
        )}
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: spacing.md, lineHeight: 18 }}>
          Games before a partner replace still count here.
        </Text>
      </ScrollView>
    </View>
  );
}

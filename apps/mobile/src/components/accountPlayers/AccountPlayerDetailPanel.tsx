import { Pressable, ScrollView, Text, View } from "react-native";
import type { OrganizerPlayerDetail, OrganizerPlayerRange } from "@padel/shared";

import { radius, spacing, touch, typography } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

function rangeLabel(range: OrganizerPlayerRange): string {
  if (range === "month") return "This month";
  if (range === "year") return `This year · ${new Date().getUTCFullYear()}`;
  return "All time";
}

function StatRow(props: { label: string; value: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        minHeight: touch.minSecondary
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "600" }}>{props.label}</Text>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 22 }}>{props.value}</Text>
    </View>
  );
}

interface AccountPlayerDetailPanelProps {
  detail: OrganizerPlayerDetail;
  errorText: string;
  onBack: () => void;
}

export function AccountPlayerDetailPanel(props: AccountPlayerDetailPanelProps) {
  const { colors } = useTheme();
  const detail = props.detail;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.md }}>
        <Pressable onPress={props.onBack} style={{ minHeight: touch.minSecondary, justifyContent: "center" }}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>← Players</Text>
        </Pressable>
        <Text style={[typography.title, { color: colors.text }]}>{detail.name}</Text>
        <Text style={{ color: colors.muted }}>{rangeLabel(detail.range)}</Text>
        {props.errorText ? <Text style={{ color: colors.danger }}>{props.errorText}</Text> : null}
        <StatRow label="Games won" value={detail.gamesWon} />
        <StatRow label="Matches won" value={detail.matchesWon} />
        <StatRow label="Events played" value={detail.eventsPlayed} />
        <Text style={[typography.sectionTitle, { color: colors.text, marginTop: spacing.sm }]}>
          Recent events
        </Text>
        {detail.recentEvents.length === 0 ? (
          <Text style={{ color: colors.muted }}>No events in this range.</Text>
        ) : (
          detail.recentEvents.map((event) => (
            <Text key={event.tournamentId} style={{ color: colors.text, lineHeight: 22 }}>
              {event.tournamentName} · {event.gamesWon} games won
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

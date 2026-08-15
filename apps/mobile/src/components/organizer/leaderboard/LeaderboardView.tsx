import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useBreakpoint } from "../../../layout";
import { radius, spacing, touch, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LeaderboardRow, LiveTournamentState } from "../../../types/organizer/tournament";
import { formatScoringLabel } from "../../../utilities/organizer/formatLabels";

import { LeaderboardRowCard } from "./LeaderboardRowCard";

const ROWS_PER_PAGE = 12;

interface LeaderboardViewProps {
  tournament: LiveTournamentState;
  rows: LeaderboardRow[];
  onBack: () => void;
  onBackToList: () => void;
  onOpenPlayer: (playerId: string) => void;
}

export function LeaderboardView(props: LeaderboardViewProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const [pageIndex, setPageIndex] = useState(0);

  const pageCount = Math.max(1, Math.ceil(props.rows.length / ROWS_PER_PAGE));
  const pagedRows = useMemo(() => {
    const start = pageIndex * ROWS_PER_PAGE;
    return props.rows.slice(start, start + ROWS_PER_PAGE).map((row, offset) => ({
      row,
      rank: start + offset + 1
    }));
  }, [pageIndex, props.rows]);

  useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(Math.max(0, pageCount - 1));
    }
  }, [pageCount, pageIndex]);

  const scoringLabel = formatScoringLabel(
    props.tournament.config.mode,
    props.tournament.config.scoringMode
  );
  const showPaging = props.rows.length > ROWS_PER_PAGE;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
        gap: spacing.md,
        backgroundColor: colors.background,
        maxWidth: formMaxWidth,
        width: "100%",
        alignSelf: "center",
        flexGrow: 1
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={props.onBack} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: "500", fontSize: 14 }}>← Live</Text>
        </Pressable>
        <Pressable onPress={props.onBackToList} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: "500", fontSize: 14 }}>Home</Text>
        </Pressable>
      </View>
      <Text style={[typography.title, { color: colors.text }]}>Leaderboard</Text>
      <Text style={{ fontSize: 14, color: colors.muted }}>
        {props.tournament.config.name} · {scoringLabel}
      </Text>

      <View style={{ gap: spacing.sm }}>
        {pagedRows.map(({ row, rank }) => (
          <LeaderboardRowCard
            key={row.playerId}
            rank={rank}
            row={row}
            onPress={() => props.onOpenPlayer(row.playerId)}
          />
        ))}
      </View>

      {props.rows.length === 0 ? (
        <Text style={{ color: colors.muted }}>No standings yet.</Text>
      ) : null}

      {showPaging ? (
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
          <Pressable
            disabled={pageIndex <= 0}
            onPress={() => setPageIndex((i) => Math.max(0, i - 1))}
            style={{
              flex: 1,
              minHeight: touch.minPrimary,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
              opacity: pageIndex <= 0 ? 0.4 : 1
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>Prev</Text>
          </Pressable>
          <Pressable
            disabled={pageIndex >= pageCount - 1}
            onPress={() => setPageIndex((i) => Math.min(pageCount - 1, i + 1))}
            style={{
              flex: 1,
              minHeight: touch.minPrimary,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
              opacity: pageIndex >= pageCount - 1 ? 0.4 : 1
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>Next page</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

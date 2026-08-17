import { FlashList } from "@shopify/flash-list";
import { Pressable, ScrollView, Text, View } from "react-native";
import { STANDINGS_LEGEND, standingsLineFromRecord } from "@padel/shared";

import { useBreakpoint } from "../../../layout";
import { spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LeaderboardRow, LiveTournamentState } from "../../../types/organizer/tournament";
import { formatScoringLabel } from "../../../utilities/organizer/formatLabels";
import { StandingsTable } from "../../standings/StandingsTable";

import { LeaderboardRowCard } from "./LeaderboardRowCard";

interface LeaderboardViewProps {
  tournament: LiveTournamentState;
  rows: LeaderboardRow[];
  onBack: () => void;
  onBackToList: () => void;
  onOpenPlayer: (playerId: string) => void;
}

type RankedRow = { row: LeaderboardRow; rank: number };

export function LeaderboardView(props: LeaderboardViewProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();

  const rankedRows: RankedRow[] = props.rows.map((row, index) => ({
    row,
    rank: index + 1
  }));

  const scoringLabel = formatScoringLabel(
    props.tournament.config.mode,
    props.tournament.config.scoringMode
  );
  const isRegular = (props.tournament.config.scoringMode ?? "AMERICANO_POINTS") === "REGULAR";

  const chrome = (
    <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
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
      {isRegular ? (
        <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>{STANDINGS_LEGEND}</Text>
      ) : null}
    </View>
  );

  if (isRegular) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xxl,
          paddingBottom: spacing.xl,
          maxWidth: formMaxWidth,
          width: "100%",
          alignSelf: "center",
          gap: spacing.md
        }}
      >
        {chrome}
        {rankedRows.length === 0 ? (
          <Text style={{ color: colors.muted }}>No standings yet.</Text>
        ) : (
          <StandingsTable
            rows={rankedRows.map((item) => ({
              id: item.row.playerId,
              rank: item.rank,
              name: item.row.name,
              line: standingsLineFromRecord({
                wins: item.row.wins,
                losses: item.row.losses,
                draws: item.row.draws,
                gamesWon: item.row.gamesWon ?? 0,
                gamesLost: item.row.gamesLost ?? 0
              })
            }))}
            onSelect={props.onOpenPlayer}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <FlashList
      data={rankedRows}
      keyExtractor={(item) => item.row.playerId}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
        maxWidth: formMaxWidth,
        width: "100%",
        alignSelf: "center",
        flexGrow: 1
      }}
      ListHeaderComponent={chrome}
      ListEmptyComponent={<Text style={{ color: colors.muted }}>No standings yet.</Text>}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      renderItem={({ item }) => (
        <LeaderboardRowCard
          rank={item.rank}
          row={item.row}
          onPress={() => props.onOpenPlayer(item.row.playerId)}
        />
      )}
    />
  );
}

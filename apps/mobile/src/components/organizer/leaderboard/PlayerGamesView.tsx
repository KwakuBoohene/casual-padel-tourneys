import { FlashList } from "@shopify/flash-list";
import { Pressable, Text, View } from "react-native";
import { countNoun, formatRegularStandings } from "@padel/shared";

import { useBreakpoint } from "../../../layout";
import { spacing, touch, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LeaderboardRow, PlayerGameRow } from "../../../types/organizer/tournament";

interface PlayerGamesViewProps {
  playerName: string;
  row: LeaderboardRow | undefined;
  games: PlayerGameRow[];
  onBack: () => void;
}

function formatSummary(row: LeaderboardRow | undefined, matchCount: number): string {
  const matchLabel = countNoun(matchCount, "match", "matches");
  if (!row) {
    return matchLabel;
  }
  if (row.isRegular) {
    return formatRegularStandings({
      wins: row.wins,
      losses: row.losses,
      setsWon: row.setsWon,
      gamesWon: row.gamesWon
    });
  }
  return `PW(A) ${row.americanoPointsWon ?? row.totalPoints} · PL(A) ${row.americanoPointsLost ?? 0} · ${matchLabel}`;
}

function formatGameLine(game: PlayerGameRow): string {
  const vs = `${game.opponents[0]}/${game.opponents[1]}`;
  if (game.pointsEarned !== null) {
    return `R${game.roundNumber}  +${game.pointsEarned}  vs ${vs}`;
  }
  if (game.scoreText && game.scoreText !== "Pending") {
    return `R${game.roundNumber}  ${game.scoreText}  vs ${vs}`;
  }
  return `R${game.roundNumber}  —  vs ${vs}`;
}

export function PlayerGamesView(props: PlayerGamesViewProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const matchCount = props.games.length;

  return (
    <FlashList
      data={props.games}
      keyExtractor={(item) => item.matchId}
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
      ListHeaderComponent={
        <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
          <Pressable onPress={props.onBack} hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: "500", fontSize: 14 }}>← Leaderboard</Text>
          </Pressable>
          <Text style={[typography.title, { color: colors.text }]}>{props.playerName}</Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>{formatSummary(props.row, matchCount)}</Text>
        </View>
      }
      ListEmptyComponent={<Text style={{ color: colors.muted }}>No games yet for this player.</Text>}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      renderItem={({ item }) => (
        <View
          style={{
            minHeight: touch.minSecondary,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.md + 2,
            paddingVertical: spacing.md + 2,
            justifyContent: "center"
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{formatGameLine(item)}</Text>
        </View>
      )}
    />
  );
}

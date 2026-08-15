import { Pressable, ScrollView, Text, View } from "react-native";

import { useBreakpoint } from "../../../layout";
import { spacing, touch, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { PlayerGameRow } from "../../../types/organizer/tournament";

interface PlayerGamesViewProps {
  playerName: string;
  totalPoints: number;
  games: PlayerGameRow[];
  onBack: () => void;
}

function formatGameLine(game: PlayerGameRow): string {
  const vs = `${game.opponents[0]}/${game.opponents[1]}`;
  if (game.pointsEarned === null) {
    return `R${game.roundNumber}  —  vs ${vs}`;
  }
  return `R${game.roundNumber}  +${game.pointsEarned}  vs ${vs}`;
}

export function PlayerGamesView(props: PlayerGamesViewProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const matchCount = props.games.length;

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
      <Pressable onPress={props.onBack} hitSlop={8}>
        <Text style={{ color: colors.primary, fontWeight: "500", fontSize: 14 }}>← Leaderboard</Text>
      </Pressable>
      <Text style={[typography.title, { color: colors.text }]}>{props.playerName}</Text>
      <Text style={{ fontSize: 14, color: colors.muted }}>
        {props.totalPoints} pts · {matchCount} match{matchCount === 1 ? "" : "es"}
      </Text>

      {props.games.length === 0 ? (
        <Text style={{ color: colors.muted }}>No games yet for this player.</Text>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {props.games.map((game) => (
          <View
            key={game.matchId}
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
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{formatGameLine(game)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

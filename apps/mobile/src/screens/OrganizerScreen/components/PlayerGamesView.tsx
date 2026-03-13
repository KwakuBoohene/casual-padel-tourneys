import { Pressable, ScrollView, Text, View } from "react-native";

import { cardStyles, colors, spacing, typography } from "../../../theme";
import type { PlayerGameRow } from "../types";

interface PlayerGamesViewProps {
  playerName: string;
  games: PlayerGameRow[];
  onBack: () => void;
}

export function PlayerGamesView(props: PlayerGamesViewProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[typography.title, { color: colors.text }]}>{props.playerName}</Text>
        <Pressable
          onPress={props.onBack}
          style={{
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
            borderRadius: 999,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Back</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 12, color: colors.muted }}>Match history</Text>

      {props.games.length === 0 ? <Text style={{ color: colors.muted }}>No games yet for this player.</Text> : null}

      {props.games.map((game) => (
        <View
          key={game.matchId}
          style={[
            cardStyles.container,
            {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center"
            }
          ]}
        >
          <View>
            <Text style={{ fontSize: 12, color: colors.muted }}>Round {game.roundNumber}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
              Court {game.court} · Partner {game.partner}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              vs {game.opponents[0]} & {game.opponents[1]}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{game.scoreText}</Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color:
                  game.result === "WIN"
                    ? colors.primary
                    : game.result === "LOSS"
                      ? colors.danger
                      : colors.muted
              }}
            >
              {game.result === "PENDING" ? "Pending" : game.result}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}


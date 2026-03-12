import { Button, ScrollView, Text, View } from "react-native";

import { cardStyles, colors, spacing, typography } from "../../theme";

import type { PlayerGameRow } from "./types";

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
        <Button title="Back" onPress={props.onBack} />
      </View>
      <Text style={{ fontSize: 12, color: colors.muted }}>Match history</Text>

      {props.games.length === 0 ? <Text style={{ color: colors.muted }}>No games yet for this player.</Text> : null}

      {props.games.map((game) => (
        <View
          key={game.matchId}
          style={[
            cardStyles.container,
            {
              borderLeftWidth: 4,
              borderLeftColor:
                game.result === "WIN" ? colors.primary : game.result === "LOSS" ? colors.danger : colors.border
            }
          ]}
        >
          <Text style={{ fontWeight: "700", color: colors.text }}>
            Round {game.roundNumber} • Court {game.court}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: spacing.sm }}>{game.scoreText}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Partner</Text>
          <Text style={{ color: colors.text, marginBottom: spacing.xs }}>{game.partner}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Opponents</Text>
          <Text style={{ color: colors.text, marginBottom: spacing.xs }}>
            {game.opponents[0]} / {game.opponents[1]}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Result</Text>
          <Text style={{ color: game.result === "WIN" ? colors.primary : colors.text, fontWeight: "700" }}>
            {game.result}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

import { Button, ScrollView, Text, View } from "react-native";

import type { PlayerGameRow } from "./types";

interface PlayerGamesViewProps {
  playerName: string;
  games: PlayerGameRow[];
  onBack: () => void;
}

export function PlayerGamesView(props: PlayerGamesViewProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>{props.playerName} - Games</Text>
      <Button title="Back" onPress={props.onBack} />

      {props.games.length === 0 ? <Text>No games yet for this player.</Text> : null}

      {props.games.map((game) => (
        <View key={game.matchId} style={{ borderWidth: 1, padding: 10, gap: 4 }}>
          <Text style={{ fontWeight: "700" }}>
            Round {game.roundNumber} - Court {game.court}
          </Text>
          <Text>Partner: {game.partner}</Text>
          <Text>
            Opponents: {game.opponents[0]} / {game.opponents[1]}
          </Text>
          <Text>Score: {game.scoreText}</Text>
          <Text>Result: {game.result}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

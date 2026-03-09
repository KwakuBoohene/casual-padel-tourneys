import { Button, Pressable, ScrollView, Text } from "react-native";

import type { LeaderboardRow, LiveTournamentState } from "./types";

interface LeaderboardViewProps {
  tournament: LiveTournamentState;
  rows: LeaderboardRow[];
  onBack: () => void;
  onOpenPlayer: (playerId: string) => void;
}

export function LeaderboardView(props: LeaderboardViewProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Leaderboard</Text>
      <Button title="Back" onPress={props.onBack} />
      <Text>{props.tournament.config.name}</Text>

      {props.rows.map((row, index) => (
        <Pressable key={row.playerId} onPress={() => props.onOpenPlayer(row.playerId)} style={{ borderWidth: 1, padding: 10, gap: 4 }}>
          <Text style={{ fontWeight: "700" }}>
            {index + 1}. {row.name}
          </Text>
          <Text>Points: {row.totalPoints}</Text>
          <Text>Games: {row.gamesPlayed}</Text>
          <Text>
            W/L/D: {row.wins}/{row.losses}/{row.draws}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

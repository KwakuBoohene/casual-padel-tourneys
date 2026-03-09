import { Button, Pressable, RefreshControl, ScrollView, Text } from "react-native";

import type { LiveTournamentState } from "./types";

interface TournamentListViewProps {
  tournaments: LiveTournamentState[];
  refreshing: boolean;
  errorText: string;
  onRefresh: () => void;
  onCreateNew: () => void;
  onOpenTournament: (id: string) => void;
}

export function TournamentListView(props: TournamentListViewProps) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, gap: 12 }}
      refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} />}
    >
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Live Tournaments</Text>
      <Button title="Pull Live Tournaments" onPress={props.onRefresh} />
      <Button title="Create New Tournament" onPress={props.onCreateNew} />

      {props.tournaments.length === 0 ? <Text>No tournaments loaded yet.</Text> : null}

      {props.tournaments.map((tournament) => (
        <Pressable
          key={tournament.id}
          onPress={() => props.onOpenTournament(tournament.id)}
          style={{ borderWidth: 1, padding: 10, gap: 4 }}
        >
          <Text style={{ fontWeight: "700" }}>{tournament.config.name}</Text>
          <Text>
            {tournament.config.mode}/{tournament.config.variant}
          </Text>
          <Text>Players: {tournament.players.length}</Text>
          <Text>Updated: {new Date(tournament.updatedAt).toLocaleString()}</Text>
        </Pressable>
      ))}

      {props.errorText ? <Text style={{ color: "red" }}>Error: {props.errorText}</Text> : null}
    </ScrollView>
  );
}

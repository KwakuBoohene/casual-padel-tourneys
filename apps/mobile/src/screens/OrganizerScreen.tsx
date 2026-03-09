import { useState } from "react";
import { Button, ScrollView, Text, TextInput, View } from "react-native";

import { apiPost } from "../api/client";

export function OrganizerScreen() {
  const [name, setName] = useState("Friday Americano");
  const [playersText, setPlayersText] = useState("A,B,C,D,E,F,G,H");
  const [responseText, setResponseText] = useState("No tournament created yet.");

  const createTournament = async () => {
    const players = playersText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const response = await apiPost<{ data: { id: string; publicToken: string } }>("/tournaments", {
      name,
      mode: "AMERICANO",
      variant: "CLASSIC",
      players,
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    });
    setResponseText(`Created ${response.data.id}\nShare token: ${response.data.publicToken}`);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Organizer Console</Text>
      <TextInput value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput value={playersText} onChangeText={setPlayersText} style={{ borderWidth: 1, padding: 8 }} />
      <Button title="Create Tournament" onPress={() => void createTournament()} />
      <View>
        <Text>{responseText}</Text>
      </View>
    </ScrollView>
  );
}

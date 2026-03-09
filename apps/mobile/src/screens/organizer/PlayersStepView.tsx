import { Button, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { PlayerGender, TournamentVariant } from "@padel/shared";

interface PlayersStepViewProps {
  players: string[];
  genders: Array<PlayerGender | undefined>;
  variant: TournamentVariant;
  sanitizedPlayers: string[];
  canContinue: boolean;
  onUpdatePlayer: (index: number, value: string) => void;
  onUpdateGender: (index: number, value: PlayerGender) => void;
  onRemovePlayer: (index: number) => void;
  onAddPlayer: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function PlayersStepView(props: PlayersStepViewProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Add Players</Text>
      <Text>Players added: {props.sanitizedPlayers.length}</Text>
      {props.players.map((playerName, index) => (
        <View key={`player-${index}`} style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={playerName}
              onChangeText={(value) => props.onUpdatePlayer(index, value)}
              placeholder={`Player ${index + 1}`}
              style={{ borderWidth: 1, padding: 8, flex: 1 }}
            />
            <Pressable onPress={() => props.onRemovePlayer(index)} style={{ padding: 8, borderWidth: 1 }}>
              <Text>Remove</Text>
            </Pressable>
          </View>
          {props.variant === "MIXED" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => props.onUpdateGender(index, "MALE")}
                style={{
                  borderWidth: 1,
                  borderColor: props.genders[index] === "MALE" ? "#0a7" : "#999",
                  backgroundColor: props.genders[index] === "MALE" ? "#d9fff3" : "#fff",
                  padding: 8
                }}
              >
                <Text>Male</Text>
              </Pressable>
              <Pressable
                onPress={() => props.onUpdateGender(index, "FEMALE")}
                style={{
                  borderWidth: 1,
                  borderColor: props.genders[index] === "FEMALE" ? "#0a7" : "#999",
                  backgroundColor: props.genders[index] === "FEMALE" ? "#d9fff3" : "#fff",
                  padding: 8
                }}
              >
                <Text>Female</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
      <Button title="Add Player" onPress={props.onAddPlayer} />
      <Text>Names: {props.sanitizedPlayers.length > 0 ? props.sanitizedPlayers.join(", ") : "None yet"}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Back" onPress={props.onBack} />
        <Button title="Next" disabled={!props.canContinue} onPress={props.onNext} />
      </View>
    </ScrollView>
  );
}

import { Button, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { PlayerGender, TournamentVariant } from "@padel/shared";

import { colors, radius, spacing, typography } from "../../theme";

interface PlayersStepViewProps {
  players: string[];
  genders: Array<PlayerGender | undefined>;
  variant: TournamentVariant;
  sanitizedPlayers: string[];
  canContinue: boolean;
  allSuggestions: string[];
  onUpdatePlayer: (index: number, value: string) => void;
  onUpdateGender: (index: number, value: PlayerGender) => void;
  onRemovePlayer: (index: number) => void;
  onAddPlayer: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function PlayersStepView(props: PlayersStepViewProps) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Text style={[typography.title, { color: colors.text }]}>Add Players</Text>
      <Text style={{ color: colors.muted }}>Players added: {props.sanitizedPlayers.length}</Text>
      {props.players.map((playerName, index) => {
        const query = playerName.trim();
        const suggestions =
          query.length === 0
            ? []
            : props.allSuggestions
                .filter(
                  (name) =>
                    name.toLowerCase().startsWith(query.toLowerCase()) &&
                    name !== playerName
                )
                .slice(0, 5);
        return (
          <View key={`player-${index}`} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
              <TextInput
                value={playerName}
                onChangeText={(value) => props.onUpdatePlayer(index, value)}
                placeholder={`Player ${index + 1}`}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.sm,
                  flex: 1,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  color: colors.text
                }}
                placeholderTextColor={colors.muted}
              />
              <Pressable
                onPress={() => props.onRemovePlayer(index)}
                style={{
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  borderColor: colors.border,
                  backgroundColor: colors.surface
                }}
              >
                <Text style={{ color: colors.text }}>Remove</Text>
              </Pressable>
            </View>
            {suggestions.length > 0 ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.xs,
                  gap: spacing.xs,
                  backgroundColor: colors.surface,
                  borderRadius: radius.md
                }}
              >
                {suggestions.map((name) => (
                  <Pressable
                    key={`${index}-suggestion-${name}`}
                    onPress={() => props.onUpdatePlayer(index, name)}
                    style={{ paddingVertical: spacing.xs }}
                  >
                    <Text style={{ color: colors.text }}>{name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          {props.variant === "MIXED" ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => props.onUpdateGender(index, "MALE")}
                style={{
                  borderWidth: 1,
                  borderColor: props.genders[index] === "MALE" ? colors.primary : colors.border,
                  backgroundColor: props.genders[index] === "MALE" ? "rgba(173,255,47,0.16)" : colors.surface,
                  padding: spacing.sm,
                  borderRadius: radius.md
                }}
              >
                <Text style={{ color: colors.text }}>Male</Text>
              </Pressable>
              <Pressable
                onPress={() => props.onUpdateGender(index, "FEMALE")}
                style={{
                  borderWidth: 1,
                  borderColor: props.genders[index] === "FEMALE" ? colors.primary : colors.border,
                  backgroundColor: props.genders[index] === "FEMALE" ? "rgba(173,255,47,0.16)" : colors.surface,
                  padding: spacing.sm,
                  borderRadius: radius.md
                }}
              >
                <Text style={{ color: colors.text }}>Female</Text>
              </Pressable>
            </View>
        ) : null}
          </View>
        );
      })}
      <Button title="Add Player" onPress={props.onAddPlayer} />
      <Text style={{ color: colors.muted }}>
        Names: {props.sanitizedPlayers.length > 0 ? props.sanitizedPlayers.join(", ") : "None yet"}
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Back" onPress={props.onBack} />
        <Button title="Next" disabled={!props.canContinue} onPress={props.onNext} />
      </View>
    </ScrollView>
  );
}

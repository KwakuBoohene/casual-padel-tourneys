import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { PlayerGender, TournamentVariant } from "@padel/shared";

import { colors, radius, spacing, typography } from "../../../theme";

interface PlayersStepViewProps {
  players: string[];
  genders: Array<PlayerGender | undefined>;
  variant: TournamentVariant;
  sanitizedPlayers: string[];
  canContinue: boolean;
  hasDuplicateNames: boolean;
  allSuggestions: string[];
  onUpdatePlayer: (index: number, value: string) => void;
  onUpdateGender: (index: number, value: PlayerGender) => void;
  onRemovePlayer: (index: number) => void;
  onAddPlayer: () => void;
  onSelectSuggestion: (name: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PlayersStepView(props: PlayersStepViewProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background }}>
      <Text style={[typography.title, { color: colors.text }]}>Players</Text>
      <Text style={{ color: colors.muted }}>Add at least 4 players to get started.</Text>

      {props.players.map((player, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm
          }}
        >
          <TextInput
            value={player}
            onChangeText={(value) => props.onUpdatePlayer(index, value)}
            placeholder={`Player ${index + 1}`}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              color: colors.text
            }}
            placeholderTextColor={colors.muted}
          />
          {props.variant === "MIXED" ? (
            <View style={{ flexDirection: "row", gap: spacing.xs }}>
              {(["MALE", "FEMALE"] as PlayerGender[]).map((gender) => (
                <Pressable
                  key={gender}
                  onPress={() => props.onUpdateGender(index, gender)}
                  style={{
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: props.genders[index] === gender ? colors.primary : colors.border,
                    backgroundColor: props.genders[index] === gender ? "rgba(173,255,47,0.16)" : colors.surface
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 12 }}>{gender === "MALE" ? "M" : "F"}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Pressable
            onPress={() => props.onRemovePlayer(index)}
            style={{
              padding: spacing.xs,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceAlt
            }}
          >
            <Text style={{ color: colors.muted, fontWeight: "700" }}>×</Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={props.onAddPlayer}
        style={{
          marginTop: spacing.sm,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Add Player</Text>
      </Pressable>

      {props.hasDuplicateNames ? (
        <Text style={{ color: colors.danger, fontSize: 12, marginTop: spacing.sm }}>
          No two players can have the same name. Remove or change duplicates to continue.
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
        <Pressable
          onPress={props.onBack}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Back</Text>
        </Pressable>
        <Pressable
          disabled={!props.canContinue}
          onPress={props.onNext}
          style={{
            flex: 1,
            paddingVertical: spacing.sm,
            borderRadius: radius.md,
            backgroundColor: props.canContinue ? colors.primary : colors.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            opacity: props.canContinue ? 1 : 0.5
          }}
        >
          <Text
            style={{
              color: "#020617",
              fontWeight: "700"
            }}
          >
            Next
          </Text>
        </Pressable>
      </View>

      {props.allSuggestions.length > 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={{ fontSize: 12, color: colors.muted, marginBottom: spacing.xs }}>Suggestions (tap to add to next empty slot)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {props.allSuggestions.slice(0, 12).map((suggestion) => {
              const isUsed = props.players.some(
                (p) => p.trim().toLowerCase() === suggestion.trim().toLowerCase()
              );
              return (
                <Pressable
                  key={suggestion}
                  onPress={() => !isUsed && props.onSelectSuggestion(suggestion)}
                  disabled={isUsed}
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: radius.pill,
                    backgroundColor: isUsed ? colors.surfaceAlt : colors.surface,
                    borderWidth: 1,
                    borderColor: isUsed ? colors.border : colors.primary,
                    opacity: isUsed ? 0.5 : 1
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: isUsed ? colors.muted : colors.text,
                      fontWeight: isUsed ? "400" : "600"
                    }}
                  >
                    {suggestion}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}


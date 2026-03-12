import { Button, Pressable, ScrollView, Text, View } from "react-native";

import { cardStyles, colors, spacing, typography } from "../../theme";

import type { LeaderboardRow, LiveTournamentState } from "./types";

interface LeaderboardViewProps {
  tournament: LiveTournamentState;
  rows: LeaderboardRow[];
  onBack: () => void;
  onOpenPlayer: (playerId: string) => void;
}

export function LeaderboardView(props: LeaderboardViewProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[typography.title, { color: colors.text }]}>Leaderboard</Text>
        <Button title="Back" onPress={props.onBack} />
      </View>
      <Text style={{ fontSize: 14, color: colors.muted }}>{props.tournament.config.name}</Text>

      {props.rows.map((row, index) => (
        <Pressable
          key={row.playerId}
          onPress={() => props.onOpenPlayer(row.playerId)}
          style={[
            cardStyles.container,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: spacing.md
            }
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <View
              style={{
                width: 4,
                height: "100%",
                backgroundColor: index === 0 ? colors.primary : colors.border,
                borderRadius: 999
              }}
            />
            <View>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {index + 1}. {row.name}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                W/L/D {row.wins}/{row.losses}/{row.draws} • {row.gamesPlayed} games
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.primary, fontWeight: "800" }}>{row.totalPoints} pts</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

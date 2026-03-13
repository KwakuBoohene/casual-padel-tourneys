import { Pressable, ScrollView, Text, View } from "react-native";

import { cardStyles, colors, radius, spacing, typography } from "../../../theme";
import type { LeaderboardRow, LiveTournamentState } from "../types";

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
        <Pressable
          onPress={props.onBack}
          style={{
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Back</Text>
        </Pressable>
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
              justifyContent: "space-between",
              alignItems: "center"
            }
          ]}
        >
          <View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
              {index + 1}. {row.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>Games: {row.gamesPlayed}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{row.totalPoints}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              W{row.wins} / D{row.draws} / L{row.losses}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}


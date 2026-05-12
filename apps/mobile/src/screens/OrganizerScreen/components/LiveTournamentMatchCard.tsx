import { Pressable, Text, View } from "react-native";

import { cardStyles, colors, radius, spacing } from "../../../theme";
import type { LiveTournamentState } from "../types";

export type LiveMatch = LiveTournamentState["rounds"][number]["matches"][number];

interface LiveTournamentMatchCardProps {
  match: LiveMatch;
  canEditScores: boolean;
  scorePicker: { matchId: string; side: "scoreA" | "scoreB" } | null;
  scoreInputs: Record<string, { scoreA: string; scoreB: string }>;
  playerNameById: Map<string, string>;
  onOpenScorePicker: (matchId: string, side: "scoreA" | "scoreB") => void;
}

export function LiveTournamentMatchCard(props: LiveTournamentMatchCardProps) {
  const { match, canEditScores, scorePicker, scoreInputs, playerNameById, onOpenScorePicker } = props;

  return (
    <View
      style={[
        cardStyles.container,
        {
          padding: spacing.md,
          gap: spacing.sm
        }
      ]}
    >
      <Text style={{ fontWeight: "700", color: colors.text }}>Court {match.court}</Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs }}>
        <View style={{ flex: 1, alignItems: "flex-start" }}>
          <Text style={{ fontSize: 10, color: colors.muted, textTransform: "uppercase" }}>Team A</Text>
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {playerNameById.get(match.teamA[0]) ?? match.teamA[0]}
          </Text>
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            {playerNameById.get(match.teamA[1]) ?? match.teamA[1]}
          </Text>
        </View>

        <View style={{ width: 40, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted, fontWeight: "700" }}>vs</Text>
        </View>

        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={{ fontSize: 10, color: colors.muted, textTransform: "uppercase" }}>Team B</Text>
          <Text style={{ color: colors.text, fontWeight: "600", textAlign: "right" }}>
            {playerNameById.get(match.teamB[0]) ?? match.teamB[0]}
          </Text>
          <Text style={{ color: colors.text, fontWeight: "600", textAlign: "right" }}>
            {playerNameById.get(match.teamB[1]) ?? match.teamB[1]}
          </Text>
        </View>
      </View>
      {canEditScores ? (
        <View style={{ flexDirection: "row", gap: spacing.sm, justifyContent: "center" }}>
          <Pressable
            onPress={() => onOpenScorePicker(match.id, "scoreA")}
            style={{
              width: 84,
              height: 84,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor:
                scorePicker?.matchId === match.id && scorePicker.side === "scoreA"
                  ? colors.primary
                  : colors.border,
              alignItems: "center",
              justifyContent: "center",
              gap: 4
            }}
          >
            <Text style={{ fontSize: 10, color: colors.muted, textTransform: "uppercase" }}>Team A</Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>
              {scoreInputs[match.id]?.scoreA ?? match.scoreA?.toString() ?? "-"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onOpenScorePicker(match.id, "scoreB")}
            style={{
              width: 84,
              height: 84,
              borderRadius: radius.md,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor:
                scorePicker?.matchId === match.id && scorePicker.side === "scoreB"
                  ? colors.primary
                  : colors.border,
              alignItems: "center",
              justifyContent: "center",
              gap: 4
            }}
          >
            <Text style={{ fontSize: 10, color: colors.muted, textTransform: "uppercase" }}>Team B</Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>
              {scoreInputs[match.id]?.scoreB ?? match.scoreB?.toString() ?? "-"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text style={{ color: colors.text }}>
          Final Score: {match.scoreA ?? "-"} - {match.scoreB ?? "-"}
        </Text>
      )}
    </View>
  );
}

import { Pressable, Text, View } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../../../types/organizer/tournament";

export type LiveMatch = LiveTournamentState["rounds"][number]["matches"][number];

interface LiveTournamentMatchCardProps {
  match: LiveMatch;
  canEditScores: boolean;
  scoreInputs: Record<string, { scoreA: string; scoreB: string }>;
  playerNameById: Map<string, string>;
  onOpenScoreEntry: (matchId: string) => void;
}

function namePair(ids: [string, string], names: Map<string, string>): string {
  return `${names.get(ids[0]) ?? ids[0]} / ${names.get(ids[1]) ?? ids[1]}`;
}

export function LiveTournamentMatchCard(props: LiveTournamentMatchCardProps) {
  const { colors } = useTheme();
  const { match, canEditScores, scoreInputs, playerNameById, onOpenScoreEntry } = props;
  const draft = scoreInputs[match.id];
  const scoreA = draft?.scoreA !== undefined && draft.scoreA !== "" ? draft.scoreA : match.scoreA?.toString();
  const scoreB = draft?.scoreB !== undefined && draft.scoreB !== "" ? draft.scoreB : match.scoreB?.toString();
  const hasScore = scoreA != null && scoreB != null && scoreA !== "" && scoreB !== "";
  const isDone = match.completed || (hasScore && !canEditScores);
  const status = !hasScore
    ? "Tap to enter score"
    : isDone
      ? `${scoreA}–${scoreB} · Done`
      : match.completed
        ? `${scoreA}–${scoreB} · Tap to edit`
        : `${scoreA}–${scoreB} · Ready`;
  const statusColor = isDone ? colors.muted : colors.primary;

  return (
    <Pressable
      disabled={!canEditScores}
      onPress={() => onOpenScoreEntry(match.id)}
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: 6,
        minHeight: touch.minPrimary + spacing.md
      }}
    >
      <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Court {match.court}</Text>
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>
        {namePair(match.teamA, playerNameById)}
        {"  vs  "}
        {namePair(match.teamB, playerNameById)}
      </Text>
      <Text style={{ color: statusColor, fontWeight: "500", fontSize: 13 }}>{status}</Text>
    </Pressable>
  );
}

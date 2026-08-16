import { Pressable, Text } from "react-native";
import type { ScoringMode } from "@padel/shared";

import { spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../../../types/organizer/tournament";
import { regularMatchStatusLine } from "../../../utilities/organizer/regularMatchDisplay";

export type LiveMatch = LiveTournamentState["rounds"][number]["matches"][number];

interface LiveTournamentMatchCardProps {
  match: LiveMatch;
  canEditScores: boolean;
  scoreInputs: Record<string, { scoreA: string; scoreB: string }>;
  playerNameById: Map<string, string>;
  scoringMode?: ScoringMode;
  onOpenScoreEntry: (matchId: string) => void;
}

function namePair(ids: [string, string], names: Map<string, string>): string {
  return `${names.get(ids[0]) ?? ids[0]} / ${names.get(ids[1]) ?? ids[1]}`;
}

function americanoStatusLine(input: {
  match: LiveMatch;
  canEditScores: boolean;
  scoreInputs: Record<string, { scoreA: string; scoreB: string }>;
}): { text: string; emphasize: boolean } {
  const { match, canEditScores, scoreInputs } = input;
  const draft = scoreInputs[match.id];
  const scoreA = draft?.scoreA !== undefined && draft.scoreA !== "" ? draft.scoreA : match.scoreA?.toString();
  const scoreB = draft?.scoreB !== undefined && draft.scoreB !== "" ? draft.scoreB : match.scoreB?.toString();
  const hasScore = scoreA != null && scoreB != null && scoreA !== "" && scoreB !== "";
  const isDone = match.completed || (hasScore && !canEditScores);
  if (!hasScore) {
    return { text: "Tap to enter score", emphasize: true };
  }
  if (isDone) {
    return { text: `${scoreA}–${scoreB} · Done`, emphasize: false };
  }
  if (match.completed) {
    return { text: `${scoreA}–${scoreB} · Tap to edit`, emphasize: true };
  }
  return { text: `${scoreA}–${scoreB} · Ready`, emphasize: true };
}

export function LiveTournamentMatchCard(props: LiveTournamentMatchCardProps) {
  const { colors } = useTheme();
  const { match, canEditScores, scoreInputs, playerNameById, onOpenScoreEntry } = props;
  const isRegular = (props.scoringMode ?? "AMERICANO_POINTS") === "REGULAR";
  const status = isRegular
    ? regularMatchStatusLine({ sets: match.sets, completed: match.completed, canEdit: canEditScores })
    : americanoStatusLine({ match, canEditScores, scoreInputs });
  const statusColor = status.emphasize ? colors.primary : colors.muted;

  const teamA = namePair(match.teamA, playerNameById);
  const teamB = namePair(match.teamB, playerNameById);

  return (
    <Pressable
      disabled={!canEditScores}
      onPress={() => onOpenScoreEntry(match.id)}
      accessibilityRole="button"
      accessibilityLabel={`Court ${match.court}, ${teamA} versus ${teamB}, ${status.text}`}
      accessibilityState={{ disabled: !canEditScores }}
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
        {teamA}
        {"  vs  "}
        {teamB}
      </Text>
      <Text style={{ color: statusColor, fontWeight: "500", fontSize: 13 }}>{status.text}</Text>
    </Pressable>
  );
}

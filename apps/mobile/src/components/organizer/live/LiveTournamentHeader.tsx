import { Pressable, Text, TextInput, View } from "react-native";

import { radius, spacing, touch, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { formatScoringLabel } from "../../../utilities/organizer/formatLabels";

import type { LiveTournamentState } from "../../../types/organizer/tournament";

import { LiveTournamentPendingBanner } from "./LiveTournamentPendingBanner";

interface LiveTournamentHeaderProps {
  tournament: LiveTournamentState;
  tournamentNameDraft: string;
  isEditingCompletedTournament: boolean;
  roundsCount: number;
  displayedRoundNumber: number | null;
  canGoPrev: boolean;
  canGoNext: boolean;
  onBackToList: () => void;
  onChangeTournamentName: (value: string) => void;
  onSaveTournamentName: () => void;
  onOpenAddPendingPlayer: () => void;
  onOpenIntegrateConfirm: () => void;
  onPrevRound: () => void;
  onNextRound: () => void;
}

export function LiveTournamentHeader(props: LiveTournamentHeaderProps) {
  const { colors } = useTheme();
  const modeLabel = formatScoringLabel(
    props.tournament.config.mode,
    props.tournament.config.scoringMode
  );
  const roundLabel =
    props.displayedRoundNumber != null && props.roundsCount > 0
      ? `Round ${props.displayedRoundNumber} of ${props.roundsCount}`
      : "No round";

  return (
    <View style={{ gap: spacing.md }}>
      <Pressable onPress={props.onBackToList} hitSlop={8}>
        <Text style={{ color: colors.primary, fontWeight: "500", fontSize: 14 }}>← Home</Text>
      </Pressable>
      {props.isEditingCompletedTournament ? (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            value={props.tournamentNameDraft}
            onChangeText={props.onChangeTournamentName}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              color: colors.text,
              fontSize: 22,
              fontWeight: "700"
            }}
          />
          <Pressable
            onPress={props.onSaveTournamentName}
            style={{
              minHeight: touch.minSecondary,
              borderRadius: radius.lg,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Save tournament name</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[typography.title, { fontSize: 22, color: colors.text }]}>
          {props.tournament.config.name}
        </Text>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <Text style={{ flex: 1, fontSize: 14, color: colors.muted }}>
          {modeLabel} · {roundLabel}
        </Text>
        {props.roundsCount > 1 ? (
          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <Pressable
              onPress={props.onPrevRound}
              disabled={!props.canGoPrev}
              style={{
                minWidth: touch.minSecondary,
                minHeight: touch.minSecondary,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                opacity: props.canGoPrev ? 1 : 0.4
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>←</Text>
            </Pressable>
            <Pressable
              onPress={props.onNextRound}
              disabled={!props.canGoNext}
              style={{
                minWidth: touch.minSecondary,
                minHeight: touch.minSecondary,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                opacity: props.canGoNext ? 1 : 0.4
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>→</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <LiveTournamentPendingBanner
        pendingPlayers={props.tournament.pendingPlayers}
        onOpenAddPendingPlayer={props.onOpenAddPendingPlayer}
        onOpenIntegrateConfirm={props.onOpenIntegrateConfirm}
      />
    </View>
  );
}

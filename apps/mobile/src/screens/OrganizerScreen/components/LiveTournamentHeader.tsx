import { Pressable, Text, TextInput, View } from "react-native";

import { radius, spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../types";

import { LiveTournamentPendingBanner } from "./LiveTournamentPendingBanner";

interface LiveTournamentHeaderProps {
  tournament: LiveTournamentState;
  tournamentNameDraft: string;
  isEditingCompletedTournament: boolean;
  roundsLeft: number;
  estimatedMinutesLeft: number;
  onBackToList: () => void;
  onViewLeaderboard: () => void;
  onOpenLiveOptions: () => void;
  onChangeTournamentName: (value: string) => void;
  onSaveTournamentName: () => void;
  onRefresh: () => void;
  onOpenAddPendingPlayer: () => void;
  onOpenIntegrateConfirm: () => void;
}

export function LiveTournamentHeader(props: LiveTournamentHeaderProps) {
  const { colors } = useTheme();

  return (
    <>
      <Text style={[typography.title, { color: colors.text }]}>Live Tournament</Text>
      <Pressable
        onPress={props.onBackToList}
        style={{
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Back To Tournament List</Text>
      </Pressable>
      <Pressable
        onPress={props.onViewLeaderboard}
        style={{
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.primary,
          alignItems: "center"
        }}
      >
        <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>View Leaderboard</Text>
      </Pressable>
      <Pressable
        onPress={props.onOpenLiveOptions}
        style={{
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Options</Text>
      </Pressable>
      {props.isEditingCompletedTournament ? (
        <>
          <Text style={{ color: colors.text }}>Edit Tournament Name</Text>
          <TextInput
            value={props.tournamentNameDraft}
            onChangeText={props.onChangeTournamentName}
            style={{ borderWidth: 1, padding: 8, color: colors.text, borderColor: colors.border }}
          />
          <Pressable
            onPress={props.onSaveTournamentName}
            style={{
              marginTop: spacing.sm,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              alignItems: "center"
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Save Tournament Name</Text>
          </Pressable>
        </>
      ) : (
        <Text style={{ color: colors.text }}>
          {props.tournament.config.name} ({props.tournament.config.mode}/{props.tournament.config.variant})
        </Text>
      )}
      <Text style={{ color: colors.muted }}>Current Version: {props.tournament.version}</Text>
      <Text style={{ color: colors.muted }}>Rounds Left: {props.roundsLeft}</Text>
      <Text style={{ color: colors.muted }}>Estimated Time Left: {props.estimatedMinutesLeft} minutes</Text>
      <Pressable
        onPress={props.onRefresh}
        style={{
          marginTop: spacing.sm,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>Refresh</Text>
      </Pressable>
      <LiveTournamentPendingBanner
        pendingPlayers={props.tournament.pendingPlayers}
        onOpenAddPendingPlayer={props.onOpenAddPendingPlayer}
        onOpenIntegrateConfirm={props.onOpenIntegrateConfirm}
      />
    </>
  );
}

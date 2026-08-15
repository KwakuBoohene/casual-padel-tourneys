import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { SchedulingMode, ScoringMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { AlertSheet } from "../../sheets";
import { useBreakpoint } from "../../../layout";
import type { Estimate } from "../../../types/organizer/tournament";
import { spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { EstimatorFooter } from "./EstimatorFooter";
import { EstimatorFormFields } from "./EstimatorFormFields";
import { EstimatorResultCard } from "./EstimatorResultCard";

interface GameEstimatorViewProps {
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  scoringMode: ScoringMode;
  setsToWin: number;
  usersText: string;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  estimate: Estimate | null;
  onChangeMode: (value: TournamentMode) => void;
  onChangeVariant: (value: TournamentVariant) => void;
  onChangeSchedulingMode: (value: SchedulingMode) => void;
  onChangeScoringMode: (value: ScoringMode) => void;
  onChangeSetsToWin: (value: number) => void;
  onChangeUsers: (value: string) => void;
  onChangeCourts: (value: string) => void;
  onChangePoints: (value: string) => void;
  onChangeTargetGames: (value: string) => void;
  onChangeTournamentTime: (value: string) => void;
  onBack: () => void;
  onUseInNewTournament: () => void;
}

function toInt(text: string, fallback: number): number {
  const n = Number(text);
  return Number.isFinite(n) && Number.isInteger(n) ? n : fallback;
}

export function GameEstimatorView(props: GameEstimatorViewProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const [showError, setShowError] = useState(false);
  const players = toInt(props.usersText, 8);
  const courts = toInt(props.courtsText, 2);
  const points = toInt(props.pointsText, 24);
  const isRegular = props.scoringMode === "REGULAR";
  const minPlayers = courts * 4;
  const impossible =
    !props.estimate ||
    players < minPlayers ||
    courts < 1 ||
    (!isRegular && points < 1) ||
    (isRegular && props.setsToWin < 1);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xxl,
          paddingBottom: spacing.md,
          gap: spacing.md,
          maxWidth: formMaxWidth,
          width: "100%",
          alignSelf: "center",
          flexGrow: 1
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.title, { color: colors.text }]}>Game estimator</Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>Plan before you create</Text>
        <EstimatorFormFields
          mode={props.mode}
          variant={props.variant}
          schedulingMode={props.schedulingMode}
          scoringMode={props.scoringMode}
          setsToWin={props.setsToWin}
          players={players}
          courts={courts}
          points={points}
          targetGames={toInt(props.targetGamesText, 8)}
          tournamentTime={toInt(props.tournamentTimeText, 90)}
          onChangeMode={props.onChangeMode}
          onChangeVariant={props.onChangeVariant}
          onChangeSchedulingMode={props.onChangeSchedulingMode}
          onChangeScoringMode={props.onChangeScoringMode}
          onChangeSetsToWin={props.onChangeSetsToWin}
          onChangeUsers={props.onChangeUsers}
          onChangeCourts={props.onChangeCourts}
          onChangePoints={props.onChangePoints}
          onChangeTargetGames={props.onChangeTargetGames}
          onChangeTournamentTime={props.onChangeTournamentTime}
        />
        <EstimatorResultCard estimate={props.estimate} />
      </ScrollView>

      <EstimatorFooter
        formMaxWidth={formMaxWidth}
        primaryLabel={props.mode === "MEXICANO" ? "Use in new Mexicano" : "Use in new Americano"}
        onBack={props.onBack}
        onPrimary={() => {
          if (impossible) setShowError(true);
          else props.onUseInNewTournament();
        }}
      />

      <AlertSheet
        visible={showError}
        variant="error"
        title="Cannot estimate tournament"
        message={
          players < minPlayers
            ? `You need at least ${minPlayers} players for ${courts} court${courts === 1 ? "" : "s"}.`
            : isRegular
              ? "Enter a valid player, court, and sets-to-win configuration to continue."
              : "Enter a valid player, court, and points configuration to continue."
        }
        primaryAction={{ label: "OK", onPress: () => setShowError(false) }}
        onDismiss={() => setShowError(false)}
      />
    </View>
  );
}

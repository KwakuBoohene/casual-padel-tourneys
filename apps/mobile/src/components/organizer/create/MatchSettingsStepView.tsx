import { useEffect, useState } from "react";
import type {
  GameWinBy,
  RegularSetFormat,
  SchedulingMode,
  ScoringMode,
  TiebreakPoints
} from "@padel/shared";

import { AlertSheet } from "../../sheets";
import type { Estimate } from "../../../types/organizer/tournament";
import type { SettingsPhase } from "../../../hooks/organizer/useScoringModeSettings";

import { MatchDetailsFields } from "./MatchDetailsFields";
import { ScoringModePhase } from "./ScoringModePhase";
import { WizardChrome } from "./WizardChrome";

interface MatchSettingsStepViewProps {
  modeLabel: string;
  schedulingMode: SchedulingMode;
  settingsPhase: SettingsPhase;
  scoringMode: ScoringMode;
  setFormat: RegularSetFormat;
  gameWinBy: GameWinBy;
  setsToWin: number;
  setTiebreakTo: TiebreakPoints;
  matchTiebreak: boolean;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  estimate: Estimate | null;
  responseText: string;
  errorText: string;
  playersCount: number;
  onChangeScoringMode: (value: ScoringMode) => void;
  onChangeSetFormat: (value: RegularSetFormat) => void;
  onChangeGameWinBy: (value: GameWinBy) => void;
  onChangeSetsToWin: (value: number) => void;
  onChangeSetTiebreakTo: (value: TiebreakPoints) => void;
  onChangeMatchTiebreak: (value: boolean) => void;
  onChangeCourts: (value: string) => void;
  onChangePoints: (value: string) => void;
  onChangeTargetGames: (value: string) => void;
  onChangeTournamentTime: (value: string) => void;
  onBackToPlayers: () => void;
  onBackToMode: () => void;
  onNextFromMode: () => void;
  onCreate: () => void;
}

function toInt(text: string, fallback: number): number {
  const n = Number(text);
  return Number.isFinite(n) && Number.isInteger(n) ? n : fallback;
}

export function MatchSettingsStepView(props: MatchSettingsStepViewProps) {
  const [showError, setShowError] = useState(false);
  const courts = toInt(props.courtsText, 1);
  const points = toInt(props.pointsText, 24);
  const targetGames = toInt(props.targetGamesText, 8);
  const tournamentTime = toInt(props.tournamentTimeText, 120);
  const minPlayersForCourts = courts > 0 ? courts * 4 : 0;
  const hasEnoughPlayersForCourts = courts > 0 && props.playersCount >= minPlayersForCourts;
  const isMode = props.settingsPhase === "MODE";
  const isRegular = props.scoringMode === "REGULAR";

  useEffect(() => {
    if (props.errorText) setShowError(true);
  }, [props.errorText]);

  const estimateLine = props.estimate
    ? `~${props.estimate.rounds} rounds · ~${props.estimate.gamesPerPlayer} matches/player · ~${Math.max(
        1,
        Math.round(props.estimate.durationMinutes / 60)
      )}h`
    : "Enter valid settings to see an estimate.";

  const tryCreate = () => {
    if (!hasEnoughPlayersForCourts) {
      setShowError(true);
      return;
    }
    props.onCreate();
  };

  return (
    <>
      <WizardChrome
        modeLabel={props.modeLabel}
        stepIndex={4}
        stepCount={4}
        progressText={isMode ? undefined : isRegular ? "Regular scoring" : undefined}
        title={isMode ? "How do we count?" : isRegular ? "Set rules" : "Americano scoring"}
        primaryLabel={isMode ? "Next" : "Create tournament"}
        primaryDisabled={isMode ? false : !hasEnoughPlayersForCourts}
        onPrimary={isMode ? props.onNextFromMode : tryCreate}
        onBack={isMode ? props.onBackToPlayers : props.onBackToMode}
      >
        {isMode ? (
          <ScoringModePhase scoringMode={props.scoringMode} onChangeScoringMode={props.onChangeScoringMode} />
        ) : (
          <MatchDetailsFields
            scoringMode={props.scoringMode}
            schedulingMode={props.schedulingMode}
            setFormat={props.setFormat}
            gameWinBy={props.gameWinBy}
            setsToWin={props.setsToWin}
            setTiebreakTo={props.setTiebreakTo}
            matchTiebreak={props.matchTiebreak}
            courts={courts}
            points={points}
            targetGames={targetGames}
            tournamentTime={tournamentTime}
            playersCount={props.playersCount}
            minPlayersForCourts={minPlayersForCourts}
            hasEnoughPlayersForCourts={hasEnoughPlayersForCourts}
            estimateLine={estimateLine}
            responseText={props.responseText}
            onChangeSetFormat={props.onChangeSetFormat}
            onChangeGameWinBy={props.onChangeGameWinBy}
            onChangeSetsToWin={props.onChangeSetsToWin}
            onChangeSetTiebreakTo={props.onChangeSetTiebreakTo}
            onChangeMatchTiebreak={props.onChangeMatchTiebreak}
            onChangeCourts={props.onChangeCourts}
            onChangePoints={props.onChangePoints}
            onChangeTargetGames={props.onChangeTargetGames}
            onChangeTournamentTime={props.onChangeTournamentTime}
          />
        )}
      </WizardChrome>

      <AlertSheet
        visible={showError}
        variant="error"
        title="Cannot create tournament"
        message={
          props.errorText ||
          `You need at least ${minPlayersForCourts || 4} players for ${courts} court${courts === 1 ? "" : "s"}.`
        }
        primaryAction={{ label: "OK", onPress: () => setShowError(false) }}
        onDismiss={() => setShowError(false)}
      />
    </>
  );
}

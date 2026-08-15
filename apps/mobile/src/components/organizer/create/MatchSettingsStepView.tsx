import { useEffect, useState } from "react";
import type {
  GameWinBy,
  RegularSetFormat,
  SchedulingMode,
  ScoringMode,
  TiebreakPoints,
  TournamentMode
} from "@padel/shared";
import { MEXICANO_MIN_PLAYERS } from "@padel/shared";

import { AlertSheet } from "../../sheets";
import type { Estimate } from "../../../types/organizer/tournament";
import type { SettingsPhase } from "../../../hooks/organizer/useScoringModeSettings";
import { formatSettingsEstimateLine } from "../../../utilities/organizer/settingsEstimateLine";

import { MatchDetailsFields } from "./MatchDetailsFields";
import { ScoringModePhase } from "./ScoringModePhase";
import { WizardChrome } from "./WizardChrome";

interface MatchSettingsStepViewProps {
  mode: TournamentMode;
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
  const isMexicano = props.mode === "MEXICANO";
  const courts = toInt(props.courtsText, 1);
  const minPlayersForCourts = courts > 0 ? courts * 4 : 0;
  const hasEnoughPlayersForCourts = courts > 0 && props.playersCount >= minPlayersForCourts;
  const hasMinPlayers = !isMexicano || props.playersCount >= MEXICANO_MIN_PLAYERS;
  const canCreate = hasEnoughPlayersForCourts && hasMinPlayers;
  const isMode = !isMexicano && props.settingsPhase === "MODE";
  const isRegular = !isMexicano && props.scoringMode === "REGULAR";

  useEffect(() => {
    if (props.errorText) setShowError(true);
  }, [props.errorText]);

  const tryCreate = () => {
    if (!canCreate) {
      setShowError(true);
      return;
    }
    props.onCreate();
  };

  const errorMessage =
    props.errorText ||
    (!hasMinPlayers
      ? `Mexicano needs at least ${MEXICANO_MIN_PLAYERS} players. Next rounds come from the leaderboard.`
      : `You need at least ${minPlayersForCourts || 4} players for ${courts} court${courts === 1 ? "" : "s"}.`);

  return (
    <>
      <WizardChrome
        modeLabel={props.modeLabel}
        stepIndex={4}
        stepCount={4}
        progressText={isMode ? undefined : isRegular ? "Regular scoring" : undefined}
        title={
          isMode ? "How do we count?" : isMexicano ? "Mexicano settings" : isRegular ? "Set rules" : "Americano scoring"
        }
        primaryLabel={isMode ? "Next" : "Create tournament"}
        primaryDisabled={isMode ? false : !canCreate}
        onPrimary={isMode ? props.onNextFromMode : tryCreate}
        onBack={isMode ? props.onBackToPlayers : isMexicano ? props.onBackToPlayers : props.onBackToMode}
      >
        {isMode ? (
          <ScoringModePhase scoringMode={props.scoringMode} onChangeScoringMode={props.onChangeScoringMode} />
        ) : (
          <MatchDetailsFields
            mode={props.mode}
            scoringMode={props.scoringMode}
            schedulingMode={props.schedulingMode}
            setFormat={props.setFormat}
            gameWinBy={props.gameWinBy}
            setsToWin={props.setsToWin}
            setTiebreakTo={props.setTiebreakTo}
            matchTiebreak={props.matchTiebreak}
            courts={courts}
            points={toInt(props.pointsText, 24)}
            targetGames={toInt(props.targetGamesText, 8)}
            tournamentTime={toInt(props.tournamentTimeText, 120)}
            playersCount={props.playersCount}
            minPlayersForCourts={minPlayersForCourts}
            hasEnoughPlayersForCourts={hasEnoughPlayersForCourts}
            estimateLine={formatSettingsEstimateLine(props.estimate, isMexicano)}
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
        message={errorMessage}
        primaryAction={{ label: "OK", onPress: () => setShowError(false) }}
        onDismiss={() => setShowError(false)}
      />
    </>
  );
}

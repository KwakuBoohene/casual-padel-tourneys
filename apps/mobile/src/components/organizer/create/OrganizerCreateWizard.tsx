import { formatTournamentMode } from "../../../utilities/organizer/formatLabels";
import type { useCreateTournament } from "../../../hooks/organizer/useCreateTournament";

import { CreatePlayersWizardStep } from "./CreatePlayersWizardStep";
import { MatchSettingsStepView } from "./MatchSettingsStepView";
import { NameStepView } from "./NameStepView";
import { TournamentOptionsStepView } from "./TournamentOptionsStepView";

type Create = ReturnType<typeof useCreateTournament>;

export function OrganizerCreateWizard({
  create
}: {
  create: Create;
}) {
  const modeLabel = formatTournamentMode(create.mode);

  if (create.wizardStep === "NAME") {
    return (
      <NameStepView
        modeLabel={modeLabel}
        mode={create.mode}
        name={create.name}
        canContinue={create.canContinueFromName}
        contributeToCareerLeaderboard={create.contributeToCareerLeaderboard}
        onChangeName={create.setName}
        onChangeContributeToCareerLeaderboard={create.setContributeToCareerLeaderboard}
        onBack={create.cancelCreateToList}
        onNext={() => create.setWizardStep("OPTIONS")}
      />
    );
  }

  if (create.wizardStep === "OPTIONS") {
    return (
      <TournamentOptionsStepView
        mode={create.mode}
        modeLocked={create.modeLockedFromList}
        modeLabel={modeLabel}
        variant={create.variant}
        schedulingMode={create.effectiveSchedulingMode}
        onChangeMode={(value) => {
          create.setMode(value);
          if (value === "MEXICANO") create.setSchedulingMode("TOTAL_TIME");
          create.prepareSettingsForMode(value);
        }}
        onChangeVariant={create.setVariant}
        onChangeSchedulingMode={create.setSchedulingMode}
        onBack={() => create.setWizardStep("NAME")}
        onNext={() => create.setWizardStep("PLAYERS")}
      />
    );
  }

  if (create.wizardStep === "PLAYERS") {
    return <CreatePlayersWizardStep create={create} />;
  }

  return (
    <MatchSettingsStepView
      mode={create.mode}
      modeLabel={modeLabel}
      schedulingMode={create.effectiveSchedulingMode}
      settingsPhase={create.settingsPhase}
      scoringMode={create.scoringMode}
      setFormat={create.setFormat}
      deuceMode={create.deuceMode}
      setsToWin={create.setsToWin}
      setTiebreakTo={create.setTiebreakTo}
      matchTiebreak={create.matchTiebreak}
      courtsText={create.courtsText}
      pointsText={create.pointsText}
      targetGamesText={create.targetGamesText}
      tournamentTimeText={create.tournamentTimeText}
      estimate={create.estimate}
      responseText={create.responseText}
      playersCount={create.sanitizedPlayers.length}
      onChangeScoringMode={create.setScoringMode}
      onChangeSetFormat={create.setSetFormat}
      onChangeDeuceMode={create.setDeuceMode}
      onChangeSetsToWin={create.setSetsToWin}
      onChangeSetTiebreakTo={create.setSetTiebreakTo}
      onChangeMatchTiebreak={create.setMatchTiebreak}
      onChangeCourts={create.onChangeCourtsValue}
      onChangePoints={create.onChangePointsValue}
      onChangeTargetGames={create.onChangeTargetGamesValue}
      onChangeTournamentTime={create.onChangeTournamentTimeValue}
      onBackToPlayers={() => create.setWizardStep("PLAYERS")}
      onBackToMode={() => create.setSettingsPhase("MODE")}
      onNextFromMode={() => create.setSettingsPhase("DETAILS")}
      onCreate={() => void create.createTournament()}
    />
  );
}

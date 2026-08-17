import type { useCreateTournament } from "../../../hooks/organizer/useCreateTournament";
import { formatTournamentMode } from "../../../utilities/organizer/formatLabels";

import { PlayersStepView } from "./PlayersStepView";
import { TeamPlayersStepView } from "./TeamPlayersStepView";

type Create = ReturnType<typeof useCreateTournament>;

/** Players (or team pairs) step for the create wizard. */
export function CreatePlayersWizardStep({ create }: { create: Create }) {
  const modeLabel = formatTournamentMode(create.mode);

  if (create.isFixedTeamMode) {
    return (
      <TeamPlayersStepView
        modeLabel={modeLabel}
        teams={create.teams}
        minTeams={create.minTeams}
        canContinue={create.canContinueFromPlayers}
        hasDuplicateNames={create.hasDuplicatePlayerNames}
        knownNames={create.allKnownPlayerNames}
        hint={
          create.mode === "MEXICANO"
            ? "Fixed pairs stay together. Ranked teams face each other (1 vs 2, 3 vs 4)."
            : "Fixed pairs stay together. Opponents rotate each round."
        }
        onAddTeam={create.addTeam}
        onUpdateTeam={create.updateTeam}
        onRemoveTeam={create.removeTeam}
        onBack={() => create.setWizardStep("OPTIONS")}
        onNext={() => {
          const suggestedCourts = Math.max(1, Math.floor(create.sanitizedPlayers.length / 4) || 1);
          create.onChangeCourtsValue(String(suggestedCourts));
          create.prepareSettingsForMode(create.mode);
          create.setWizardStep("SETTINGS");
        }}
      />
    );
  }

  return (
    <PlayersStepView
      modeLabel={modeLabel}
      players={create.players}
      genders={create.playerGenders}
      variant={create.variant}
      minPlayers={create.minPlayers}
      canContinue={create.canContinueFromPlayers}
      hasDuplicateNames={create.hasDuplicatePlayerNames}
      allSuggestions={create.allKnownPlayerNames}
      onAddPlayer={create.addPlayer}
      onUpdatePlayer={create.updatePlayer}
      onRemovePlayer={create.removePlayerInput}
      onSelectSuggestion={create.selectSuggestion}
      onBack={() => create.setWizardStep("OPTIONS")}
      onNext={() => {
        const suggestedCourts = Math.max(1, Math.floor(create.sanitizedPlayers.length / 4) || 1);
        create.onChangeCourtsValue(String(suggestedCourts));
        if (create.mode === "MEXICANO") {
          create.prepareSettingsForMode("MEXICANO");
        }
        create.setWizardStep("SETTINGS");
      }}
    />
  );
}

import type { SetupStep } from "../../types/organizer/tournament";
import type { KohTournamentHub } from "../../types/koh/create";
import type { LiveTournamentState } from "../../types/organizer/tournament";

export async function openOrganizerTournament(input: {
  tournamentId: string;
  editMode?: boolean;
  listed?: LiveTournamentState;
  openKoh: (id: string) => Promise<KohTournamentHub | null>;
  openAmericano: (id: string, editMode?: boolean) => Promise<void>;
  setStep: (step: SetupStep) => void;
}): Promise<void> {
  if (input.listed?.config.mode === "KING_OF_THE_HILL") {
    const hub = await input.openKoh(input.tournamentId);
    if (hub) {
      input.setStep("KOH_LIVE");
    }
    return;
  }
  await input.openAmericano(input.tournamentId, input.editMode);
}

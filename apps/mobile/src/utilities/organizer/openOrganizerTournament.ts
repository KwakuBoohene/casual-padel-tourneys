import type { SetupStep } from "../../types/organizer/tournament";
import type { KohTournamentHub } from "../../types/koh/create";
import type { LiveTournamentState } from "../../types/organizer/tournament";

export type OpenOrganizerResult = "koh" | "live" | "leaderboard" | "error";

export async function openOrganizerTournament(input: {
  tournamentId: string;
  editMode?: boolean;
  listed?: LiveTournamentState;
  openKoh: (id: string) => Promise<KohTournamentHub | null>;
  openAmericano: (
    id: string,
    editMode?: boolean
  ) => Promise<"live" | "leaderboard" | "needs_koh" | "error">;
  setStep: (step: SetupStep) => void;
}): Promise<OpenOrganizerResult> {
  const openKohFlow = async (): Promise<OpenOrganizerResult> => {
    const hub = await input.openKoh(input.tournamentId);
    if (hub) {
      input.setStep("KOH_LIVE");
      return "koh";
    }
    return "error";
  };

  if (input.listed?.config.mode === "KING_OF_THE_HILL") {
    return openKohFlow();
  }

  const result = await input.openAmericano(input.tournamentId, input.editMode);
  if (result === "needs_koh") {
    return openKohFlow();
  }
  return result;
}

import type { Dispatch, SetStateAction } from "react";
import type { PlayerGender, SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { apiPost } from "../../api/client";
import { isEmailVerifyRequired } from "../../api/errors";
import type { CreateTournamentResponse, LiveTournamentState, SetupStep } from "../../types/organizer/tournament";

import { prepareCreateTournamentRequest } from "./createTournamentRequest";

export async function submitCreateTournament(input: {
  name: string;
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  players: string[];
  playerGenders: Array<PlayerGender | undefined>;
  sanitizedPlayersCount: number;
  hasDuplicatePlayerNames: boolean;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  setErrorText: (value: string) => void;
  setResponseText: (value: string) => void;
  setTournaments: Dispatch<SetStateAction<LiveTournamentState[]>>;
  setStep: (step: SetupStep) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  adoptTournament: (data: LiveTournamentState, editMode: boolean) => void;
}): Promise<void> {
  input.setErrorText("");
  const prepared = prepareCreateTournamentRequest({
    name: input.name,
    mode: input.mode,
    variant: input.variant,
    schedulingMode: input.schedulingMode,
    players: input.players,
    playerGenders: input.playerGenders,
    sanitizedPlayersCount: input.sanitizedPlayersCount,
    hasDuplicatePlayerNames: input.hasDuplicatePlayerNames,
    courtsText: input.courtsText,
    pointsText: input.pointsText,
    targetGamesText: input.targetGamesText,
    tournamentTimeText: input.tournamentTimeText
  });
  if (!prepared.ok) {
    input.setErrorText(prepared.error);
    return;
  }
  try {
    const response = await apiPost<CreateTournamentResponse>("/tournaments", prepared.payload);
    input.setResponseText(`Created ${response.data.id}\nShare token: ${response.data.publicToken}`);
    input.adoptTournament(response.data, false);
    input.setTournaments((previous) => [
      response.data,
      ...previous.filter((item) => item.id !== response.data.id)
    ]);
    input.setStep("LIVE");
  } catch (error) {
    if (isEmailVerifyRequired(error)) {
      input.markEmailVerifyRequired(error.verifyBy);
      return;
    }
    input.setErrorText((error as Error).message);
  }
}

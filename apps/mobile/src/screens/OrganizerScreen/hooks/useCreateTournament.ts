import { useState, type Dispatch, type SetStateAction } from "react";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { apiPost } from "../../../api/client";
import { isEmailVerifyRequired } from "../../../api/errors";
import type {
  CreateTournamentResponse,
  LiveTournamentState,
  SetupStep,
  TournamentListResponse
} from "../types";

import { prepareCreateTournamentRequest } from "./createTournamentRequest";
import { useMatchSettings } from "./useMatchSettings";
import { usePlayerRoster } from "./usePlayerRoster";

export interface UseCreateTournamentParams {
  tournaments: TournamentListResponse["data"];
  suggestedPlayerNames: string[];
  setTournaments: Dispatch<SetStateAction<TournamentListResponse["data"]>>;
  setStep: (step: SetupStep) => void;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  adoptTournament: (data: LiveTournamentState, editMode: boolean) => void;
}

export function useCreateTournament({
  tournaments,
  suggestedPlayerNames,
  setTournaments,
  setStep,
  setErrorText,
  markEmailVerifyRequired,
  adoptTournament
}: UseCreateTournamentParams) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<TournamentMode>("AMERICANO");
  const [variant, setVariant] = useState<TournamentVariant>("CLASSIC");
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>("TARGET_GAMES");
  const [responseText, setResponseText] = useState("No tournament created yet.");

  const effectiveSchedulingMode: SchedulingMode = mode === "MEXICANO" ? "TOTAL_TIME" : schedulingMode;
  const roster = usePlayerRoster({ variant, tournaments, suggestedPlayerNames });
  const settings = useMatchSettings({
    mode,
    effectiveSchedulingMode,
    playersCount: roster.sanitizedPlayers.length
  });

  const createTournament = async () => {
    setErrorText("");
    const prepared = prepareCreateTournamentRequest({
      name,
      mode,
      variant,
      schedulingMode: effectiveSchedulingMode,
      players: roster.players,
      playerGenders: roster.playerGenders,
      sanitizedPlayersCount: roster.sanitizedPlayers.length,
      hasDuplicatePlayerNames: roster.hasDuplicatePlayerNames,
      courtsText: settings.courtsText,
      pointsText: settings.pointsText,
      targetGamesText: settings.targetGamesText,
      tournamentTimeText: settings.tournamentTimeText
    });
    if (!prepared.ok) {
      setErrorText(prepared.error);
      return;
    }
    try {
      const response = await apiPost<CreateTournamentResponse>("/tournaments", prepared.payload);
      setResponseText(`Created ${response.data.id}\nShare token: ${response.data.publicToken}`);
      adoptTournament(response.data, false);
      setTournaments((previous) => [
        response.data,
        ...previous.filter((item) => item.id !== response.data.id)
      ]);
      setStep("LIVE");
    } catch (error) {
      if (isEmailVerifyRequired(error)) {
        markEmailVerifyRequired(error.verifyBy);
        return;
      }
      setErrorText((error as Error).message);
    }
  };

  return {
    ...roster,
    ...settings,
    name,
    setName,
    canContinueFromName: name.trim().length >= 2,
    mode,
    setMode,
    variant,
    setVariant,
    schedulingMode,
    setSchedulingMode,
    effectiveSchedulingMode,
    responseText,
    createTournament
  };
}

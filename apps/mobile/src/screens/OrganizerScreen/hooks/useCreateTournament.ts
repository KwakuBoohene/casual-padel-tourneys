import { useState, type Dispatch, type SetStateAction } from "react";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import type { LiveTournamentState, SetupStep, TournamentListResponse } from "../types";

import { submitCreateTournament } from "./submitCreateTournament";
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
  const [modeLockedFromList, setModeLockedFromList] = useState(false);
  const [variant, setVariant] = useState<TournamentVariant>("CLASSIC");
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>("TARGET_GAMES");
  const [responseText, setResponseText] = useState("No tournament created yet.");
  const effectiveSchedulingMode: SchedulingMode = mode === "MEXICANO" ? "TOTAL_TIME" : schedulingMode;

  const startCreateWithMode = (preset: TournamentMode) => {
    setErrorText("");
    setName("");
    setMode(preset);
    setModeLockedFromList(true);
    setVariant("CLASSIC");
    setSchedulingMode(preset === "MEXICANO" ? "TOTAL_TIME" : "TARGET_GAMES");
    setStep("NAME");
  };

  const cancelCreateToList = () => {
    setModeLockedFromList(false);
    setStep("LIST");
  };

  const roster = usePlayerRoster({ variant, tournaments, suggestedPlayerNames });
  const settings = useMatchSettings({
    mode,
    effectiveSchedulingMode,
    playersCount: roster.sanitizedPlayers.length
  });

  const createTournament = () =>
    submitCreateTournament({
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
      tournamentTimeText: settings.tournamentTimeText,
      setErrorText,
      setResponseText,
      setTournaments,
      setStep,
      markEmailVerifyRequired,
      adoptTournament
    });

  return {
    ...roster,
    ...settings,
    name,
    setName,
    canContinueFromName: name.trim().length >= 2,
    mode,
    setMode,
    modeLockedFromList,
    startCreateWithMode,
    cancelCreateToList,
    variant,
    setVariant,
    schedulingMode,
    setSchedulingMode,
    effectiveSchedulingMode,
    responseText,
    createTournament
  };
}

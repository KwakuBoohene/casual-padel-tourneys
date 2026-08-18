import { router } from "expo-router";
import { useState } from "react";
import type { SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import type {
  EstimatorCreateDraft,
  LiveTournamentState,
  TournamentListResponse
} from "../../types/organizer/tournament";
import { submitCreateTournament } from "../../utilities/organizer/submitCreateTournament";

import { useMatchSettings } from "./useMatchSettings";
import { usePlayerRoster } from "./usePlayerRoster";

export type CreateWizardStep = "NAME" | "OPTIONS" | "PLAYERS" | "SETTINGS";

type Params = {
  tournaments: TournamentListResponse["data"];
  suggestedPlayerNames: string[];
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  adoptTournament: (data: LiveTournamentState, editMode: boolean) => void;
};

export function useCreateTournament({
  tournaments,
  suggestedPlayerNames,
  setErrorText,
  markEmailVerifyRequired,
  adoptTournament
}: Params) {
  const [wizardStep, setWizardStep] = useState<CreateWizardStep>("NAME");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<TournamentMode>("AMERICANO");
  const [modeLockedFromList, setModeLockedFromList] = useState(false);
  const [variant, setVariant] = useState<TournamentVariant>("CLASSIC");
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>("TARGET_GAMES");
  const [responseText, setResponseText] = useState("No tournament created yet.");
  const effectiveSchedulingMode: SchedulingMode = mode === "MEXICANO" ? "TOTAL_TIME" : schedulingMode;

  const roster = usePlayerRoster({ mode, variant, tournaments, suggestedPlayerNames });
  const settings = useMatchSettings({
    mode,
    variant,
    effectiveSchedulingMode,
    playersCount: roster.sanitizedPlayers.length
  });

  const startCreateWithMode = (preset: TournamentMode) => {
    setErrorText("");
    setName("");
    setMode(preset);
    setModeLockedFromList(true);
    setVariant("CLASSIC");
    setSchedulingMode(preset === "MEXICANO" ? "TOTAL_TIME" : "TARGET_GAMES");
    settings.prepareSettingsForMode(preset);
    setWizardStep("NAME");
  };

  const startCreateFromEstimator = (draft: EstimatorCreateDraft) => {
    setErrorText("");
    setName("");
    setMode(draft.mode);
    setModeLockedFromList(true);
    setVariant(draft.variant);
    setSchedulingMode(draft.mode === "MEXICANO" ? "TOTAL_TIME" : draft.schedulingMode);
    settings.applySettings(draft);
    if (draft.mode === "MEXICANO") settings.prepareSettingsForMode("MEXICANO");
    setWizardStep("NAME");
  };

  const createTournament = () =>
    submitCreateTournament({
      name,
      mode,
      variant,
      schedulingMode: effectiveSchedulingMode,
      players: roster.players,
      playerGenders: roster.playerGenders,
      teams: roster.teams,
      sanitizedPlayersCount: roster.sanitizedPlayers.length,
      hasDuplicatePlayerNames: roster.hasDuplicatePlayerNames,
      courtsText: settings.courtsText,
      pointsText: settings.pointsText,
      targetGamesText: settings.targetGamesText,
      tournamentTimeText: settings.tournamentTimeText,
      scoringMode: settings.scoringMode,
      regularScoring: settings.regularScoring,
      contributeToCareerLeaderboard: settings.contributeToCareerLeaderboard,
      setErrorText,
      setResponseText,
      markEmailVerifyRequired,
      adoptTournament
    });

  return {
    ...roster,
    ...settings,
    wizardStep,
    setWizardStep,
    name,
    setName,
    canContinueFromName: name.trim().length >= 2,
    mode,
    setMode,
    modeLockedFromList,
    startCreateWithMode,
    startCreateFromEstimator,
    cancelCreateToList: () => {
      setModeLockedFromList(false);
      router.replace("/tournaments");
    },
    variant,
    setVariant,
    schedulingMode,
    setSchedulingMode,
    effectiveSchedulingMode,
    responseText,
    createTournament
  };
}

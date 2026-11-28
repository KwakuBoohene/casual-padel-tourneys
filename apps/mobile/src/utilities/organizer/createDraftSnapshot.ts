import type { CreateWizardStep, useCreateTournament } from "../../hooks/organizer/useCreateTournament";

import type { DraftWizardSnapshot } from "./draftPayload";

type Create = ReturnType<typeof useCreateTournament>;

/** Read the Americano/Mexicano wizard into a draft snapshot. */
export function snapshotFromCreate(create: Create, settingsChosen: boolean): DraftWizardSnapshot {
  return {
    name: create.name,
    mode: create.mode === "MEXICANO" ? "MEXICANO" : "AMERICANO",
    variant: create.variant,
    schedulingMode: create.effectiveSchedulingMode,
    players: create.individualPlayers,
    playerGenders: create.playerGenders,
    teams: create.teams,
    courtsText: create.courtsText,
    pointsText: create.pointsText,
    targetGamesText: create.targetGamesText,
    tournamentTimeText: create.tournamentTimeText,
    scoringMode: create.scoringMode,
    regularScoring: create.regularScoring,
    contributeToCareerLeaderboard: create.contributeToCareerLeaderboard,
    settingsChosen
  };
}

/**
 * Restore a draft into the wizard. Setters batch in call order, so the explicit values
 * below win over the defaults `startCreateWithMode` / `applySettings` apply first.
 */
export function applyDraftSnapshot(create: Create, snapshot: DraftWizardSnapshot, step: CreateWizardStep) {
  const scoring = snapshot.regularScoring;
  create.startCreateWithMode(snapshot.mode);
  create.setName(snapshot.name);
  create.setVariant(snapshot.variant);
  create.setSchedulingMode(snapshot.schedulingMode);
  create.replaceRoster({
    players: snapshot.players,
    playerGenders: snapshot.playerGenders,
    teams: snapshot.teams
  });
  create.setContributeToCareerLeaderboard(snapshot.contributeToCareerLeaderboard);
  create.setWizardStep(step);
  // Settings the organizer never chose stay at the wizard's defaults, including the scoring
  // question itself (`startCreateWithMode` reset them above).
  if (!snapshot.settingsChosen) return;
  create.applySettings({
    courtsText: snapshot.courtsText,
    pointsText: snapshot.pointsText,
    targetGamesText: snapshot.targetGamesText,
    tournamentTimeText: snapshot.tournamentTimeText,
    scoringMode: snapshot.scoringMode,
    setsToWin: scoring.setsToWin
  });
  create.setScoringMode(snapshot.scoringMode);
  create.setSetFormat(scoring.setFormat);
  create.setGameWinBy(scoring.gameWinBy ?? null);
  if (scoring.deuceMode) create.setDeuceMode(scoring.deuceMode);
  create.setSetsToWin(scoring.setsToWin);
  if (scoring.setTiebreakTo) create.setSetTiebreakTo(scoring.setTiebreakTo);
  create.setMatchTiebreak(scoring.matchTiebreak ?? false);
  // `applySettings` resets this to its default.
  create.setContributeToCareerLeaderboard(snapshot.contributeToCareerLeaderboard);
  create.setSettingsPhase("DETAILS");
}

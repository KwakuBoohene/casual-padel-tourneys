import type {
  AmericanoMexicanoDraftPayload,
  DraftReadiness,
  PlayerGender,
  RegularScoringConfig,
  SchedulingMode,
  ScoringMode,
  TournamentVariant
} from "@padel/shared";
import { defaultGameWinByForSetFormat, needsSetTiebreak } from "@padel/shared";

import type { TeamPairDraft } from "../../hooks/organizer/usePlayerRoster";
import type { CreateWizardStep } from "../../hooks/organizer/useCreateTournament";

/** Everything the Americano/Mexicano create wizard holds that a draft persists. */
export interface DraftWizardSnapshot {
  name: string;
  mode: "AMERICANO" | "MEXICANO";
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  players: string[];
  playerGenders: (PlayerGender | undefined)[];
  teams: TeamPairDraft[];
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  scoringMode: ScoringMode;
  regularScoring: RegularScoringConfig;
  contributeToCareerLeaderboard: boolean;
}

const positiveInt = (text: string): number | undefined => {
  const value = Number(text);
  return Number.isInteger(value) && value >= 1 ? value : undefined;
};

/** Wizard state → draft payload. Text fields that aren't valid numbers are simply left out. */
export function toDraftPayload(state: DraftWizardSnapshot): AmericanoMexicanoDraftPayload {
  const teamMode = state.variant === "TEAM";
  const regular = state.scoringMode === "REGULAR";
  const payload: AmericanoMexicanoDraftPayload = {
    name: state.name,
    mode: state.mode,
    variant: state.variant,
    schedulingMode: state.schedulingMode,
    players: teamMode
      ? []
      : state.players.map((name, index) => {
          const gender = state.playerGenders[index];
          return gender ? { name, gender } : { name };
        }),
    ...(teamMode
      ? { teams: state.teams.map((team) => ({ playerA: { name: team.playerA }, playerB: { name: team.playerB } })) }
      : {}),
    courts: positiveInt(state.courtsText),
    scoringMode: state.scoringMode,
    ...(regular ? { regularScoring: withoutUndefined(state.regularScoring) } : { pointsPerMatch: positiveInt(state.pointsText) }),
    ...(state.schedulingMode === "TARGET_GAMES" ? { targetGamesPerPlayer: positiveInt(state.targetGamesText) } : {}),
    ...(state.schedulingMode === "TOTAL_TIME" ? { tournamentTimeMinutes: positiveInt(state.tournamentTimeText) } : {}),
    contributeToCareerLeaderboard: state.contributeToCareerLeaderboard
  };
  return withoutUndefined(payload);
}

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

/** Mirror `useScoringModeSettings`'s derived config so a reloaded draft round-trips unchanged. */
function wizardRegularScoring(
  scoring: NonNullable<AmericanoMexicanoDraftPayload["regularScoring"]>
): RegularScoringConfig {
  const setFormat = scoring.setFormat ?? "FULL_SET";
  const gameWinBy = scoring.gameWinBy ?? defaultGameWinByForSetFormat(setFormat);
  const setsToWin = scoring.setsToWin ?? 1;
  return {
    setFormat,
    gameWinBy,
    deuceMode: scoring.deuceMode ?? "ADVANTAGE",
    setsToWin,
    setTiebreakTo: needsSetTiebreak(setFormat, gameWinBy) ? (scoring.setTiebreakTo ?? 7) : undefined,
    matchTiebreak: setsToWin > 1 ? (scoring.matchTiebreak ?? false) : undefined
  };
}

const DEFAULTS = { courtsText: "2", pointsText: "24", targetGamesText: "4", tournamentTimeText: "90" };

/** Draft payload → wizard state, filling the wizard's usual defaults for anything missing. */
export function fromDraftPayload(payload: AmericanoMexicanoDraftPayload): DraftWizardSnapshot {
  const teamMode = payload.variant === "TEAM";
  const scoringMode = payload.scoringMode ?? (payload.regularScoring ? "REGULAR" : "AMERICANO_POINTS");
  const scoring = payload.regularScoring ?? {};
  return {
    name: payload.name ?? "",
    mode: payload.mode,
    variant: payload.variant ?? "CLASSIC",
    schedulingMode: payload.schedulingMode ?? (payload.mode === "MEXICANO" ? "TOTAL_TIME" : "TARGET_GAMES"),
    players: teamMode ? [] : (payload.players ?? []).map((player) => player.name),
    playerGenders: teamMode ? [] : (payload.players ?? []).map((player) => player.gender),
    teams: teamMode ? (payload.teams ?? []).map((team) => ({ playerA: team.playerA.name, playerB: team.playerB.name })) : [],
    courtsText: payload.courts ? String(payload.courts) : DEFAULTS.courtsText,
    pointsText: payload.pointsPerMatch ? String(payload.pointsPerMatch) : DEFAULTS.pointsText,
    targetGamesText: payload.targetGamesPerPlayer ? String(payload.targetGamesPerPlayer) : DEFAULTS.targetGamesText,
    tournamentTimeText: payload.tournamentTimeMinutes ? String(payload.tournamentTimeMinutes) : DEFAULTS.tournamentTimeText,
    scoringMode,
    regularScoring: wizardRegularScoring(scoring),
    contributeToCareerLeaderboard: payload.contributeToCareerLeaderboard ?? true
  };
}

/** Where to reopen the wizard: the first section the readiness check flags. */
export function resumeStepFor(readiness: DraftReadiness): CreateWizardStep {
  const missing = readiness.items.find((item) => item.status === "missing")?.key;
  if (missing === "name") return "NAME";
  if (missing === "format") return "OPTIONS";
  if (missing === "players") return "PLAYERS";
  return readiness.ready ? "SETTINGS" : missing ? "SETTINGS" : "NAME";
}

/** Worth offering "Save as draft?" when leaving: something beyond the defaults was entered. */
export function hasDraftContent(state: Pick<DraftWizardSnapshot, "name" | "players" | "teams">): boolean {
  return state.name.trim().length > 0 || state.players.some((name) => name.trim()) || state.teams.length > 0;
}

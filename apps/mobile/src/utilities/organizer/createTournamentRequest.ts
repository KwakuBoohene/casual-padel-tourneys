import type {
  PlayerGender,
  RegularScoringConfig,
  SchedulingMode,
  ScoringMode,
  TournamentMode,
  TournamentVariant
} from "@padel/shared";
import { MEXICANO_MIN_PLAYERS } from "@padel/shared";

import type { TeamPairDraft } from "../../hooks/organizer/usePlayerRoster";
import { isFixedTeamMode, minTeamsForMode, teamModeLabel } from "./fixedTeamMode";

export interface CreateTournamentDraft {
  name: string;
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  players: string[];
  playerGenders: (PlayerGender | undefined)[];
  teams?: TeamPairDraft[];
  sanitizedPlayersCount: number;
  hasDuplicatePlayerNames: boolean;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  scoringMode: ScoringMode;
  regularScoring: RegularScoringConfig;
  contributeToCareerLeaderboard?: boolean;
}

export interface CreateTournamentPayload {
  name: string;
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  players: { name: string; gender: PlayerGender | undefined }[];
  teams?: {
    playerA: { name: string; gender?: PlayerGender };
    playerB: { name: string; gender?: PlayerGender };
  }[];
  courts: number;
  pointsPerMatch?: number;
  scoringMode: ScoringMode;
  regularScoring?: RegularScoringConfig;
  targetGamesPerPlayer: number | undefined;
  tournamentTimeMinutes: number | undefined;
  contributeToCareerLeaderboard: boolean;
}

export type PreparedCreateTournamentRequest =
  | { ok: false; error: string }
  | { ok: true; payload: CreateTournamentPayload };

export function prepareCreateTournamentRequest(
  draft: CreateTournamentDraft
): PreparedCreateTournamentRequest {
  const courts = Number(draft.courtsText);
  const pointsPerMatch = Number(draft.pointsText);
  const targetGames = Number(draft.targetGamesText);
  const tournamentTime = Number(draft.tournamentTimeText);
  const scoringMode = draft.scoringMode;
  const teamMode = isFixedTeamMode(draft.mode, draft.variant);

  if (!Number.isInteger(courts) || courts < 1) {
    return { ok: false, error: "Courts must be a whole number greater than 0." };
  }
  if (scoringMode === "AMERICANO_POINTS") {
    if (!Number.isInteger(pointsPerMatch) || pointsPerMatch < 1) {
      return { ok: false, error: "Points per match must be a whole number greater than 0." };
    }
  }
  if (draft.schedulingMode === "TARGET_GAMES" && (!Number.isInteger(targetGames) || targetGames < 1)) {
    return { ok: false, error: "Target games must be a whole number greater than 0." };
  }
  if (
    draft.mode !== "MEXICANO" &&
    draft.schedulingMode === "TOTAL_TIME" &&
    (!Number.isInteger(tournamentTime) || tournamentTime < 10)
  ) {
    return { ok: false, error: "Tournament time must be a whole number of at least 10 minutes." };
  }
  if (teamMode) {
    const teamCount = draft.teams?.length ?? 0;
    const minTeams = minTeamsForMode(draft.mode);
    if (teamCount < minTeams) {
      return {
        ok: false,
        error: `${teamModeLabel(draft.mode)} needs at least ${minTeams} fixed pairs.`
      };
    }
  }
  if (draft.sanitizedPlayersCount < courts * 4) {
    return {
      ok: false,
      error: `${courts} court${courts === 1 ? "" : "s"} require at least ${courts * 4} players.`
    };
  }
  if (!teamMode && draft.mode === "MEXICANO" && draft.sanitizedPlayersCount < MEXICANO_MIN_PLAYERS) {
    return {
      ok: false,
      error: `Mexicano needs at least ${MEXICANO_MIN_PLAYERS} players. Next rounds are built from the leaderboard.`
    };
  }
  if (draft.hasDuplicatePlayerNames) {
    return { ok: false, error: "No two players can have the same name." };
  }
  if (scoringMode === "REGULAR") {
    if (draft.regularScoring.setFormat === "FULL_SET" && draft.regularScoring.gameWinBy === 2) {
      if (draft.regularScoring.setTiebreakTo !== 7 && draft.regularScoring.setTiebreakTo !== 10) {
        return { ok: false, error: "Choose set tiebreak to 7 or 10 for full set win-by-2." };
      }
    }
  }

  const teams = teamMode
    ? (draft.teams ?? []).map((team) => ({
        playerA: { name: team.playerA.trim(), gender: undefined as PlayerGender | undefined },
        playerB: { name: team.playerB.trim(), gender: undefined as PlayerGender | undefined }
      }))
    : undefined;

  const players = teamMode
    ? (teams ?? []).flatMap((team) => [team.playerA, team.playerB])
    : draft.players
        .map((playerName, index) => ({
          name: playerName.trim(),
          gender: draft.variant === "MIXED" ? draft.playerGenders[index] : undefined
        }))
        .filter((item) => item.name.length > 0);

  const base = {
    name: draft.name.trim(),
    mode: draft.mode,
    variant: draft.variant,
    schedulingMode: draft.schedulingMode,
    players,
    teams,
    courts,
    targetGamesPerPlayer:
      draft.mode !== "MEXICANO" && draft.schedulingMode === "TARGET_GAMES" ? targetGames : undefined,
    tournamentTimeMinutes:
      draft.mode !== "MEXICANO" && draft.schedulingMode === "TOTAL_TIME" ? tournamentTime : undefined,
    contributeToCareerLeaderboard: draft.contributeToCareerLeaderboard ?? true
  };

  if (scoringMode === "REGULAR") {
    return {
      ok: true,
      payload: {
        ...base,
        scoringMode: "REGULAR",
        regularScoring: draft.regularScoring
      }
    };
  }

  return {
    ok: true,
    payload: {
      ...base,
      pointsPerMatch,
      scoringMode: "AMERICANO_POINTS"
    }
  };
}

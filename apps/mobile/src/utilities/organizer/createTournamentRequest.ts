import type {
  PlayerGender,
  RegularScoringConfig,
  SchedulingMode,
  ScoringMode,
  TournamentMode,
  TournamentVariant
} from "@padel/shared";

export interface CreateTournamentDraft {
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
  scoringMode: ScoringMode;
  regularScoring: RegularScoringConfig;
}

export interface CreateTournamentPayload {
  name: string;
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  players: Array<{ name: string; gender: PlayerGender | undefined }>;
  courts: number;
  pointsPerMatch?: number;
  scoringMode: ScoringMode;
  regularScoring?: RegularScoringConfig;
  targetGamesPerPlayer: number | undefined;
  tournamentTimeMinutes: number | undefined;
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
  if (draft.schedulingMode === "TOTAL_TIME" && (!Number.isInteger(tournamentTime) || tournamentTime < 10)) {
    return { ok: false, error: "Tournament time must be a whole number of at least 10 minutes." };
  }
  if (draft.sanitizedPlayersCount < courts * 4) {
    return {
      ok: false,
      error: `${courts} court${courts === 1 ? "" : "s"} require at least ${courts * 4} players.`
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

  const players = draft.players
    .map((playerName, index) => ({
      name: playerName.trim(),
      gender: draft.variant === "MIXED" ? draft.playerGenders[index] : undefined
    }))
    .filter((item) => item.name.length > 0);

  if (scoringMode === "REGULAR") {
    return {
      ok: true,
      payload: {
        name: draft.name.trim(),
        mode: draft.mode,
        variant: draft.variant,
        schedulingMode: draft.schedulingMode,
        players,
        courts,
        scoringMode: "REGULAR",
        regularScoring: draft.regularScoring,
        targetGamesPerPlayer: draft.schedulingMode === "TARGET_GAMES" ? targetGames : undefined,
        tournamentTimeMinutes: draft.schedulingMode === "TOTAL_TIME" ? tournamentTime : undefined
      }
    };
  }

  return {
    ok: true,
    payload: {
      name: draft.name.trim(),
      mode: draft.mode,
      variant: draft.variant,
      schedulingMode: draft.schedulingMode,
      players,
      courts,
      pointsPerMatch,
      scoringMode: "AMERICANO_POINTS",
      targetGamesPerPlayer: draft.schedulingMode === "TARGET_GAMES" ? targetGames : undefined,
      tournamentTimeMinutes: draft.schedulingMode === "TOTAL_TIME" ? tournamentTime : undefined
    }
  };
}

import type { PlayerGender, SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

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
}

export interface CreateTournamentPayload {
  name: string;
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  players: Array<{ name: string; gender: PlayerGender | undefined }>;
  courts: number;
  pointsPerMatch: number;
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

  if (!Number.isInteger(courts) || courts < 1) {
    return { ok: false, error: "Courts must be a whole number greater than 0." };
  }
  if (!Number.isInteger(pointsPerMatch) || pointsPerMatch < 1) {
    return { ok: false, error: "Points per match must be a whole number greater than 0." };
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

  return {
    ok: true,
    payload: {
      name: draft.name.trim(),
      mode: draft.mode,
      variant: draft.variant,
      schedulingMode: draft.schedulingMode,
      players: draft.players
        .map((playerName, index) => ({
          name: playerName.trim(),
          gender: draft.variant === "MIXED" ? draft.playerGenders[index] : undefined
        }))
        .filter((item) => item.name.length > 0),
      courts,
      pointsPerMatch,
      targetGamesPerPlayer: draft.schedulingMode === "TARGET_GAMES" ? targetGames : undefined,
      tournamentTimeMinutes: draft.schedulingMode === "TOTAL_TIME" ? tournamentTime : undefined
    }
  };
}

import type { TournamentState } from "../../../types/state.js";
import { logger } from "../../../lib/logger.js";
import { recalculateRemainingTournament } from "../../../engine/americanoScheduler.js";

import { buildLeaderboard } from "./leaderboard.js";
import { touch } from "./helpers.js";

export function applyRenamePlayer(
  tournament: TournamentState,
  playerId: string,
  newName: string
): TournamentState {
  const player = tournament.players.find((item) => item.id === playerId);
  if (!player) {
    throw new Error("Player not found.");
  }
  player.name = newName;
  tournament.leaderboard = buildLeaderboard(
    tournament.players,
    tournament.config.scoringMode,
    tournament.rounds
  );
  touch(tournament);
  logger.info("domain/applyRenamePlayer", { tournamentId: tournament.id, playerId, newName });
  return tournament;
}

export function applyRenameTournament(tournament: TournamentState, newName: string): TournamentState {
  tournament.config.name = newName;
  touch(tournament);
  logger.info("domain/applyRenameTournament", { tournamentId: tournament.id, newName });
  return tournament;
}

export function applySubstitutePlayer(
  tournament: TournamentState,
  playerId: string,
  replacementName: string
): TournamentState {
  const player = tournament.players.find((item) => item.id === playerId);
  if (!player) {
    throw new Error("Player not found.");
  }
  player.name = replacementName;
  touch(tournament);
  logger.info("domain/applySubstitutePlayer", {
    tournamentId: tournament.id,
    playerId,
    replacementName
  });
  return tournament;
}

export function applyAdjustCourts(tournament: TournamentState, courts: number): TournamentState {
  if (tournament.config.mode === "MEXICANO") {
    throw new Error("Adjusting courts mid-tournament is not supported for Mexicano.");
  }
  tournament.config.courts = courts;
  tournament.rounds = recalculateRemainingTournament(
    tournament.config,
    tournament.players,
    tournament.rounds
  );
  touch(tournament);
  logger.info("domain/applyAdjustCourts", {
    tournamentId: tournament.id,
    courts,
    version: tournament.version
  });
  return tournament;
}

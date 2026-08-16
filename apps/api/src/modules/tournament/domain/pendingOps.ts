import { createId } from "@padel/shared";
import type { PendingPlayer, Player } from "@padel/shared";

import { recalculateRemainingTournament } from "../../../engine/americanoScheduler.js";
import {
  calculateAverageGames,
  calculateHandicap,
  canIntegratePlayers
} from "../../../engine/playerIntegration.js";
import type { TournamentState } from "../../../types/state.js";
import { logger } from "../../../lib/logger.js";

import { buildLeaderboard } from "./leaderboard.js";
import { generateUniqueName, touch } from "./helpers.js";

export function applyAddPendingPlayer(
  tournament: TournamentState,
  name: string,
  gender: "MALE" | "FEMALE" | undefined
): TournamentState {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Player name is required.");
  }

  const existingNames = [
    ...tournament.players.map((p) => p.name),
    ...tournament.pendingPlayers.map((p) => p.name)
  ];
  const uniqueName = generateUniqueName(trimmedName, existingNames);

  const pendingPlayer: PendingPlayer = {
    id: createId("player"),
    name: uniqueName,
    gender,
    createdAt: new Date().toISOString()
  };

  tournament.pendingPlayers.push(pendingPlayer);
  touch(tournament);

  logger.info("domain/applyAddPendingPlayer", {
    tournamentId: tournament.id,
    playerId: pendingPlayer.id,
    originalName: trimmedName,
    finalName: uniqueName,
    wasDuplicate: trimmedName !== uniqueName,
    gender
  });

  return tournament;
}

export function applyIntegratePendingPlayers(tournament: TournamentState): TournamentState {
  if (tournament.config.mode === "MEXICANO") {
    throw new Error("Pending player integration is not supported for Mexicano yet.");
  }

  const validation = canIntegratePlayers(tournament);
  if (!validation.can) {
    throw new Error(validation.reason || "Cannot integrate players");
  }

  const avgGames = calculateAverageGames(tournament.players);
  const handicap = calculateHandicap(avgGames, 0.5);
  const newWave = tournament.integrationWaveCount + 1;

  const newPlayers: Player[] = tournament.pendingPlayers.map((pending) => ({
    id: pending.id,
    name: pending.name,
    gender: pending.gender,
    gamesPlayed: 0,
    totalPoints: 0,
    handicap,
    integrationWave: newWave
  }));

  tournament.players.push(...newPlayers);
  tournament.pendingPlayers = [];
  tournament.integrationWaveCount = newWave;
  tournament.rounds = recalculateRemainingTournament(
    tournament.config,
    tournament.players,
    tournament.rounds
  );
  tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
  touch(tournament);

  logger.info("domain/applyIntegratePendingPlayers", {
    tournamentId: tournament.id,
    newPlayersCount: newPlayers.length,
    wave: newWave,
    handicap,
    totalPlayers: tournament.players.length
  });

  return tournament;
}

import { createId } from "@padel/shared";
import type { TournamentConfig } from "@padel/shared";

import { generateMexicano } from "../../../engine/mexicanoScheduler.js";
import { generateTournament } from "../../../engine/americanoScheduler.js";
import type { TournamentState } from "../../../types/state.js";
import { logger } from "../../../lib/logger.js";

import { buildLeaderboard } from "./leaderboard.js";

/** Build a new Americano/Mexicano aggregate (no I/O). */
export function createTournamentState(config: TournamentConfig, organizerId: string): TournamentState {
  if (config.mode === "KING_OF_THE_COURT") {
    throw new Error("Use createKohTournament for King of the Court.");
  }
  const id = createId("tournament");
  const createdAt = new Date().toISOString();
  const generated = config.mode === "MEXICANO" ? generateMexicano(config) : generateTournament(config);
  const state: TournamentState = {
    id,
    config,
    players: generated.players,
    rounds: generated.rounds,
    version: 0,
    leaderboard: buildLeaderboard(generated.players, config.scoringMode, generated.rounds),
    publicToken: createId("public"),
    organizerId,
    createdAt,
    updatedAt: createdAt,
    pendingPlayers: [],
    integrationWaveCount: 0,
    endedAt: null,
    fixedPairs: "fixedPairs" in generated ? (generated.fixedPairs as TournamentState["fixedPairs"]) : undefined
  };
  logger.info("domain/createTournamentState", {
    id,
    mode: config.mode,
    variant: config.variant,
    organizerId,
    players: state.players.length,
    rounds: state.rounds.length
  });
  return state;
}

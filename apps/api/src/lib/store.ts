/**
 * In-memory workspace for unit tests (`tests/lib/store*.test.ts`).
 * Production HTTP uses PrismaTournamentRepository — do not import from routes/modules.
 */
import type { MatchSet, TournamentConfig } from "@padel/shared";

import type { TournamentState } from "../types/state.js";
import { createTournamentState } from "../modules/tournament/domain/createTournamentState.js";
import { assertTournamentVersion } from "../modules/tournament/domain/helpers.js";
import { applyAdvanceMexicanoRound, applyEndMexicanoNight } from "../modules/tournament/domain/mexicanoOps.js";
import { applyAddPendingPlayer, applyIntegratePendingPlayers } from "../modules/tournament/domain/pendingOps.js";
import { applyPointsScore } from "../modules/tournament/domain/pointsScore.js";
import { applyRegularScore } from "../modules/tournament/domain/regularScore.js";
import {
  applyAdjustCourts,
  applyRenamePlayer,
  applyRenameTournament,
  applySubstitutePlayer
} from "../modules/tournament/domain/renameAndCourts.js";
import { logger } from "./logger.js";

const tournaments = new Map<string, TournamentState>();
const MAX_TOURNAMENTS_IN_MEMORY = 100;
const lastAccessed = new Map<string, number>();

function recordAccess(id: string): void {
  lastAccessed.set(id, Date.now());
}

function isCompleted(tournament: TournamentState): boolean {
  if (tournament.endedAt) {
    return true;
  }
  return tournament.rounds.every((round) => round.matches.every((match) => match.completed));
}

function evictOldestCompletedIfOverCapacity(): void {
  if (tournaments.size <= MAX_TOURNAMENTS_IN_MEMORY) {
    return;
  }
  let candidateId: string | null = null;
  let candidateTs = Number.POSITIVE_INFINITY;
  for (const [id, tournament] of tournaments.entries()) {
    if (!isCompleted(tournament)) continue;
    const ts = lastAccessed.get(id) ?? 0;
    if (ts < candidateTs) {
      candidateTs = ts;
      candidateId = id;
    }
  }
  if (candidateId) {
    tournaments.delete(candidateId);
    lastAccessed.delete(candidateId);
  }
}

function requireTournament(id: string): TournamentState {
  const tournament = tournaments.get(id);
  if (!tournament) {
    throw new Error(`Tournament ${id} not found.`);
  }
  recordAccess(id);
  return tournament;
}

function put(state: TournamentState): void {
  tournaments.set(state.id, state);
  recordAccess(state.id);
  evictOldestCompletedIfOverCapacity();
}

export function listTournamentsByUser(organizerId: string): TournamentState[] {
  return [...tournaments.values()].filter((tournament) => tournament.organizerId === organizerId);
}

export function getTournament(id: string): TournamentState | undefined {
  const tournament = tournaments.get(id);
  if (tournament) recordAccess(id);
  return tournament;
}

export function getTournamentByPublicToken(token: string): TournamentState | undefined {
  const tournament = [...tournaments.values()].find((item) => item.publicToken === token);
  if (tournament) recordAccess(tournament.id);
  return tournament;
}

export function putTournament(state: TournamentState): void {
  put(state);
  logger.debug("store/putTournament", { id: state.id });
}

export function createTournament(config: TournamentConfig, organizerId: string): TournamentState {
  const state = createTournamentState(config, organizerId);
  put(state);
  return state;
}

export function submitScore(
  tournamentId: string,
  matchId: string,
  scoreA: number,
  scoreB: number
): TournamentState {
  return applyPointsScore(requireTournament(tournamentId), matchId, scoreA, scoreB);
}

export function submitRegularScore(
  tournamentId: string,
  matchId: string,
  sets: MatchSet[],
  options: { complete: boolean; matchTbA?: number; matchTbB?: number }
): TournamentState {
  return applyRegularScore(requireTournament(tournamentId), matchId, sets, options);
}

export function renamePlayer(tournamentId: string, playerId: string, newName: string): TournamentState {
  return applyRenamePlayer(requireTournament(tournamentId), playerId, newName);
}

export function renameTournament(tournamentId: string, newName: string): TournamentState {
  return applyRenameTournament(requireTournament(tournamentId), newName);
}

export function substitutePlayer(
  tournamentId: string,
  playerId: string,
  replacementName: string
): TournamentState {
  return applySubstitutePlayer(requireTournament(tournamentId), playerId, replacementName);
}

export function deleteTournament(tournamentId: string): void {
  if (!tournaments.has(tournamentId)) {
    throw new Error("Tournament not found.");
  }
  tournaments.delete(tournamentId);
  lastAccessed.delete(tournamentId);
}

export function adjustCourts(tournamentId: string, courts: number): TournamentState {
  return applyAdjustCourts(requireTournament(tournamentId), courts);
}

export function advanceMexicanoRound(tournamentId: string): TournamentState {
  return applyAdvanceMexicanoRound(requireTournament(tournamentId));
}

export function endMexicanoNight(tournamentId: string): TournamentState {
  return applyEndMexicanoNight(requireTournament(tournamentId));
}

export function assertVersion(tournamentId: string, expectedVersion: number): void {
  assertTournamentVersion(requireTournament(tournamentId), expectedVersion);
}

export function addPendingPlayer(
  tournamentId: string,
  name: string,
  gender: "MALE" | "FEMALE" | undefined
): TournamentState {
  return applyAddPendingPlayer(requireTournament(tournamentId), name, gender);
}

export function integratePendingPlayers(tournamentId: string): TournamentState {
  return applyIntegratePendingPlayers(requireTournament(tournamentId));
}

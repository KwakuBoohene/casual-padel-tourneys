import { createId } from "@padel/shared";
import type { LeaderboardEntry, Match, Player, Round, TournamentConfig } from "@padel/shared";

import { generateMexicano } from "../engine/mexicanoScheduler.js";
import { generateTournament, recalculateRemainingTournament } from "../engine/americanoScheduler.js";
import type { TournamentState } from "../types/state.js";
import { logger } from "./logger.js";

const tournaments = new Map<string, TournamentState>();

// Basic in-memory cache controls
const MAX_TOURNAMENTS_IN_MEMORY = 100;
const lastAccessed = new Map<string, number>();

function recordAccess(id: string): void {
  lastAccessed.set(id, Date.now());
}

function isCompleted(tournament: TournamentState): boolean {
  return tournament.rounds.every((round) => round.matches.every((match) => match.completed));
}

function evictOldestCompletedIfOverCapacity(): void {
  if (tournaments.size <= MAX_TOURNAMENTS_IN_MEMORY) {
    return;
  }

  let candidateId: string | null = null;
  let candidateTs = Number.POSITIVE_INFINITY;

  for (const [id, tournament] of tournaments.entries()) {
    if (!isCompleted(tournament)) {
      continue;
    }
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

export function listTournamentsByUser(organizerId: string): TournamentState[] {
  const result = [...tournaments.values()].filter((tournament) => tournament.organizerId === organizerId);
  logger.debug("store/listTournamentsByUser", { organizerId, count: result.length });
  return result;
}

export function getTournament(id: string): TournamentState | undefined {
  const tournament = tournaments.get(id);
  if (tournament) {
    recordAccess(id);
  }
  logger.debug("store/getTournament", { id, found: Boolean(tournament) });
  return tournament;
}

export function getTournamentByPublicToken(token: string): TournamentState | undefined {
  const tournament = [...tournaments.values()].find((item) => item.publicToken === token);
  if (tournament) {
    recordAccess(tournament.id);
  }
  logger.debug("store/getTournamentByPublicToken", { token, found: Boolean(tournament) });
  return tournament;
}

export function putTournament(state: TournamentState): void {
  tournaments.set(state.id, state);
  recordAccess(state.id);
  evictOldestCompletedIfOverCapacity();
  logger.debug("store/putTournament", { id: state.id, players: state.players.length, rounds: state.rounds.length });
}

export function createTournament(config: TournamentConfig, organizerId: string): TournamentState {
  const id = createId("tournament");
  const createdAt = new Date().toISOString();
  const generated = config.mode === "MEXICANO" ? generateMexicano(config) : generateTournament(config);
  const state: TournamentState = {
    id,
    config,
    players: generated.players,
    rounds: generated.rounds,
    version: 0,
    leaderboard: buildLeaderboard(generated.players),
    publicToken: createId("public"),
    organizerId,
    createdAt,
    updatedAt: createdAt
  };
  tournaments.set(id, state);
  recordAccess(id);
  evictOldestCompletedIfOverCapacity();
  logger.info("store/createTournament", {
    id,
    mode: config.mode,
    variant: config.variant,
    organizerId,
    players: state.players.length,
    rounds: state.rounds.length
  });
  return state;
}

export function submitScore(tournamentId: string, matchId: string, scoreA: number, scoreB: number): TournamentState {
  const tournament = requireTournament(tournamentId);
  const lookup = findMatch(tournament.rounds, matchId);
  lookup.match.scoreA = scoreA;
  lookup.match.scoreB = scoreB;
  lookup.match.completed = true;
  lookup.round.isLocked = lookup.round.matches.every((match) => match.completed);
  awardPoints(tournament.players, lookup.match, scoreA, scoreB);
  tournament.leaderboard = buildLeaderboard(tournament.players);
  touch(tournament);
  logger.info("store/submitScore", {
    tournamentId,
    matchId,
    scoreA,
    scoreB,
    version: tournament.version
  });
  return tournament;
}

export function renamePlayer(tournamentId: string, playerId: string, newName: string): TournamentState {
  const tournament = requireTournament(tournamentId);
  const player = tournament.players.find((item) => item.id === playerId);
  if (!player) {
    throw new Error("Player not found.");
  }
  player.name = newName;
  tournament.leaderboard = buildLeaderboard(tournament.players);
  touch(tournament);
  logger.info("store/renamePlayer", { tournamentId, playerId, newName });
  return tournament;
}

export function renameTournament(tournamentId: string, newName: string): TournamentState {
  const tournament = requireTournament(tournamentId);
  tournament.config.name = newName;
  touch(tournament);
  logger.info("store/renameTournament", { tournamentId, newName });
  return tournament;
}

export function substitutePlayer(tournamentId: string, playerId: string, replacementName: string): TournamentState {
  const tournament = requireTournament(tournamentId);
  const player = tournament.players.find((item) => item.id === playerId);
  if (!player) {
    throw new Error("Player not found.");
  }
  player.name = replacementName;
  touch(tournament);
  logger.info("store/substitutePlayer", { tournamentId, playerId, replacementName });
  return tournament;
}

export function deleteTournament(tournamentId: string): void {
  const exists = tournaments.has(tournamentId);
  if (!exists) {
    throw new Error("Tournament not found.");
  }
  tournaments.delete(tournamentId);
  lastAccessed.delete(tournamentId);
  logger.info("store/deleteTournament", { tournamentId });
}

export function adjustCourts(tournamentId: string, courts: number): TournamentState {
  const tournament = requireTournament(tournamentId);
  tournament.config.courts = courts;
  tournament.rounds = recalculateRemainingTournament(tournament.config, tournament.players, tournament.rounds);
  touch(tournament);
  logger.info("store/adjustCourts", { tournamentId, courts, version: tournament.version });
  return tournament;
}

export function assertVersion(tournamentId: string, expectedVersion: number): void {
  const tournament = requireTournament(tournamentId);
  if (tournament.version !== expectedVersion) {
    logger.warn("store/assertVersion mismatch", {
      tournamentId,
      expectedVersion,
      actualVersion: tournament.version
    });
    throw new Error("Version mismatch. Refresh tournament data.");
  }
}

function awardPoints(players: Player[], match: Match, scoreA: number, scoreB: number): void {
  const apply = (playerId: string, points: number): void => {
    const player = players.find((item) => item.id === playerId);
    if (player) {
      player.totalPoints += points;
    }
  };
  for (const playerId of match.teamA) {
    apply(playerId, scoreA);
  }
  for (const playerId of match.teamB) {
    apply(playerId, scoreB);
  }
}

function buildLeaderboard(players: Player[]): LeaderboardEntry[] {
  return [...players]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((player, index) => ({
      playerId: player.id,
      name: player.name,
      totalPoints: player.totalPoints,
      gamesPlayed: player.gamesPlayed,
      rank: index + 1
    }));
}

function touch(tournament: TournamentState): void {
  tournament.version += 1;
  tournament.updatedAt = new Date().toISOString();
}

function findMatch(rounds: Round[], matchId: string): { round: Round; match: Match } {
  for (const round of rounds) {
    const match = round.matches.find((item) => item.id === matchId);
    if (match) {
      return { round, match };
    }
  }
  throw new Error("Match not found.");
}

function requireTournament(id: string): TournamentState {
  const tournament = getTournament(id);
  if (!tournament) {
    throw new Error("Tournament not found.");
  }
  return tournament;
}

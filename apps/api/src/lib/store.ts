import { createId } from "@padel/shared";
import type { LeaderboardEntry, Match, Player, Round, TournamentConfig } from "@padel/shared";

import { generateMexicano } from "../engine/mexicanoScheduler.js";
import { generateTournament, recalculateRemainingTournament } from "../engine/americanoScheduler.js";
import type { TournamentState } from "../types/state.js";

const tournaments = new Map<string, TournamentState>();

export function listTournamentsByUser(organizerId: string): TournamentState[] {
  return [...tournaments.values()].filter((tournament) => tournament.organizerId === organizerId);
}

export function getTournament(id: string): TournamentState | undefined {
  return tournaments.get(id);
}

export function getTournamentByPublicToken(token: string): TournamentState | undefined {
  return [...tournaments.values()].find((item) => item.publicToken === token);
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
  return tournament;
}

export function renameTournament(tournamentId: string, newName: string): TournamentState {
  const tournament = requireTournament(tournamentId);
  tournament.config.name = newName;
  touch(tournament);
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
  return tournament;
}

export function deleteTournament(tournamentId: string): void {
  const exists = tournaments.has(tournamentId);
  if (!exists) {
    throw new Error("Tournament not found.");
  }
  tournaments.delete(tournamentId);
}

export function adjustCourts(tournamentId: string, courts: number): TournamentState {
  const tournament = requireTournament(tournamentId);
  tournament.config.courts = courts;
  tournament.rounds = recalculateRemainingTournament(tournament.config, tournament.players, tournament.rounds);
  touch(tournament);
  return tournament;
}

export function assertVersion(tournamentId: string, expectedVersion: number): void {
  const tournament = requireTournament(tournamentId);
  if (tournament.version !== expectedVersion) {
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
  const tournament = tournaments.get(id);
  if (!tournament) {
    throw new Error("Tournament not found.");
  }
  return tournament;
}

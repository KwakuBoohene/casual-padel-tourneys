import { createId } from "@padel/shared";
import type {
  LeaderboardEntry,
  Match,
  MatchSet,
  Player,
  Round,
  TournamentConfig,
  PendingPlayer
} from "@padel/shared";

import { generateMexicano, buildNextMexicanoRound } from "../engine/mexicanoScheduler.js";
import { generateTournament, recalculateRemainingTournament } from "../engine/americanoScheduler.js";
import {
  awardDeltasForWinner,
  evaluateMatch,
  type Side
} from "../engine/regularScoring.js";
import type { TournamentState } from "../types/state.js";
import { logger } from "./logger.js";
import {
  calculateAverageGames,
  calculateHandicap,
  canIntegratePlayers
} from "../engine/playerIntegration.js";

const tournaments = new Map<string, TournamentState>();

// Basic in-memory cache controls
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
  logger.debug("store/putTournament", {
    id: state.id,
    players: state.players.length,
    rounds: state.rounds.length
  });
}

export function createTournament(config: TournamentConfig, organizerId: string): TournamentState {
  if (config.mode === "KING_OF_THE_HILL") {
    throw new Error("Use createKohTournament for King of the Hill.");
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
    leaderboard: buildLeaderboard(generated.players, config.scoringMode),
    publicToken: createId("public"),
    organizerId,
    createdAt,
    updatedAt: createdAt,
    pendingPlayers: [],
    integrationWaveCount: 0,
    endedAt: null,
    fixedPairs: "fixedPairs" in generated ? generated.fixedPairs : undefined
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

export function submitScore(
  tournamentId: string,
  matchId: string,
  scoreA: number,
  scoreB: number
): TournamentState {
  const tournament = requireTournament(tournamentId);
  assertMexicanoNotEnded(tournament);
  if ((tournament.config.scoringMode ?? "AMERICANO_POINTS") === "REGULAR") {
    throw new Error("Use submitRegularScore for Regular scoring tournaments.");
  }
  const lookup = findMatch(tournament.rounds, matchId);
  const wasCompleted = lookup.match.completed;
  if (wasCompleted) {
    const laterRoundStarted = tournament.rounds.some(
      (round) =>
        round.roundNumber > lookup.round.roundNumber &&
        (round.isLocked || round.matches.some((match) => match.completed))
    );
    const mexicanoNextExists =
      tournament.config.mode === "MEXICANO" &&
      tournament.rounds.some((round) => round.roundNumber > lookup.round.roundNumber);
    if (laterRoundStarted || mexicanoNextExists) {
      throw new Error("Cannot edit a score after a later round has started.");
    }
  }
  if (
    wasCompleted &&
    lookup.match.scoreA !== undefined &&
    lookup.match.scoreB !== undefined
  ) {
    // Reverse prior awards so organizers can correct a round without double-counting.
    awardPoints(tournament.players, lookup.match, -lookup.match.scoreA, -lookup.match.scoreB);
  }
  lookup.match.scoreA = scoreA;
  lookup.match.scoreB = scoreB;
  lookup.match.completed = true;
  if (!wasCompleted) {
    bumpGamesPlayed(tournament.players, lookup.match, 1);
  }
  lookup.round.isLocked = lookup.round.matches.every((match) => match.completed);
  awardPoints(tournament.players, lookup.match, scoreA, scoreB);
  tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
  touch(tournament);
  logger.info("store/submitScore", {
    tournamentId,
    matchId,
    scoreA,
    scoreB,
    replaced: wasCompleted,
    version: tournament.version
  });
  return tournament;
}

export function submitRegularScore(
  tournamentId: string,
  matchId: string,
  sets: MatchSet[],
  options: { complete: boolean; matchTbA?: number; matchTbB?: number }
): TournamentState {
  const tournament = requireTournament(tournamentId);
  if ((tournament.config.scoringMode ?? "AMERICANO_POINTS") !== "REGULAR") {
    throw new Error("submitRegularScore requires REGULAR scoring mode.");
  }
  const regular = tournament.config.regularScoring;
  if (!regular) {
    throw new Error("Tournament is missing regularScoring config.");
  }

  const lookup = findMatch(tournament.rounds, matchId);
  const wasCompleted = lookup.match.completed;
  if (wasCompleted && lookup.match.sets && lookup.match.sets.length > 0) {
    const prior = evaluateMatch(lookup.match.sets, regular, {
      a: lookup.match.matchTbA,
      b: lookup.match.matchTbB
    });
    if (prior.complete && prior.winner) {
      applyRegularAward(tournament.players, lookup.match, prior.winner, prior, -1);
    }
  }

  lookup.match.sets = sets.map((set) => ({ ...set }));
  lookup.match.matchTbA = options.matchTbA;
  lookup.match.matchTbB = options.matchTbB;
  lookup.match.scoreA = undefined;
  lookup.match.scoreB = undefined;

  if (!options.complete) {
    lookup.match.completed = false;
    lookup.round.isLocked = lookup.round.matches.every((match) => match.completed);
    tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
    touch(tournament);
    logger.info("store/submitRegularScore", {
      tournamentId,
      matchId,
      complete: false,
      version: tournament.version
    });
    return tournament;
  }

  const evaluation = evaluateMatch(sets, regular, {
    a: options.matchTbA,
    b: options.matchTbB
  });
  if (!evaluation.complete || !evaluation.winner) {
    throw new Error(evaluation.error ?? "Regular match is not complete.");
  }

  lookup.match.completed = true;
  applyRegularAward(tournament.players, lookup.match, evaluation.winner, evaluation, 1);
  lookup.round.isLocked = lookup.round.matches.every((match) => match.completed);
  tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
  touch(tournament);
  logger.info("store/submitRegularScore", {
    tournamentId,
    matchId,
    complete: true,
    winner: evaluation.winner,
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
  tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
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

export function substitutePlayer(
  tournamentId: string,
  playerId: string,
  replacementName: string
): TournamentState {
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
  logger.info("store/adjustCourts", { tournamentId, courts, version: tournament.version });
  return tournament;
}

/**
 * After the current Mexicano round is fully scored, append the next ladder round.
 * Legacy multi-round Mexicano (old Americano wrapper): keeps locked rounds, drops
 * unlocked pre-scheduled future rounds, then appends one ladder round.
 */
export function advanceMexicanoRound(tournamentId: string): TournamentState {
  const tournament = requireTournament(tournamentId);
  if (tournament.config.mode !== "MEXICANO") {
    throw new Error("advanceMexicanoRound requires a Mexicano tournament.");
  }
  assertMexicanoNotEnded(tournament);

  const ordered = [...tournament.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const locked = ordered.filter((round) => round.matches.every((match) => match.completed));
  if (locked.length === 0) {
    throw new Error("Finish the current round before generating the next.");
  }

  const lastLocked = locked[locked.length - 1];
  if (!ordered.slice(0, locked.length).every((round, index) => round.id === locked[index].id)) {
    throw new Error("Finish the current round before generating the next.");
  }

  const afterLocked = ordered.filter((round) => round.roundNumber > lastLocked.roundNumber);
  if (afterLocked.length > 0) {
    const midRound = afterLocked.find(
      (round) =>
        round.matches.some((match) => match.completed) &&
        round.matches.some((match) => !match.completed)
    );
    if (midRound) {
      throw new Error("Finish the current round before generating the next.");
    }
    const allVirgin = afterLocked.every((round) =>
      round.matches.every((match) => !match.completed)
    );
    if (allVirgin && afterLocked.length === 1) {
      // True-ladder: next round already appended and not started.
      throw new Error("Next round already generated.");
    }
    // Legacy Americano-wrapper schedules: multiple virgin future rounds — drop them.
  }

  tournament.rounds = ordered.filter((round) => round.roundNumber <= lastLocked.roundNumber);

  const next = buildNextMexicanoRound({
    players: tournament.players,
    courts: tournament.config.courts,
    variant: tournament.config.variant,
    roundNumber: lastLocked.roundNumber + 1,
    fixedPairs: tournament.fixedPairs
  });
  if (next.matches.length === 0) {
    throw new Error("Not enough players to build another Mexicano round.");
  }
  tournament.rounds.push(next);
  tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
  touch(tournament);
  logger.info("store/advanceMexicanoRound", {
    tournamentId,
    fromRound: lastLocked.roundNumber,
    toRound: next.roundNumber,
    matches: next.matches.length,
    version: tournament.version
  });
  return tournament;
}

/**
 * End a Mexicano night. If the latest round is incomplete, discard it
 * (reversing any scored matches in that round). Completed rounds are kept.
 */
export function endMexicanoNight(tournamentId: string): TournamentState {
  const tournament = requireTournament(tournamentId);
  if (tournament.config.mode !== "MEXICANO") {
    throw new Error("endMexicanoNight requires a Mexicano tournament.");
  }
  if (tournament.endedAt) {
    throw new Error("This Mexicano night has already ended.");
  }

  const ordered = [...tournament.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const latest = ordered[ordered.length - 1];
  let discardedRoundNumber: number | null = null;

  if (latest && latest.matches.some((match) => !match.completed)) {
    discardedRoundNumber = latest.roundNumber;
    for (const match of latest.matches) {
      if (!match.completed) continue;
      if (
        (tournament.config.scoringMode ?? "AMERICANO_POINTS") === "AMERICANO_POINTS" &&
        match.scoreA !== undefined &&
        match.scoreB !== undefined
      ) {
        awardPoints(tournament.players, match, -match.scoreA, -match.scoreB);
        bumpGamesPlayed(tournament.players, match, -1);
      }
    }
    tournament.rounds = ordered.filter((round) => round.id !== latest.id);
  }

  tournament.endedAt = new Date().toISOString();
  tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);
  touch(tournament);
  logger.info("store/endMexicanoNight", {
    tournamentId,
    discardedRoundNumber,
    roundsKept: tournament.rounds.length,
    version: tournament.version
  });
  return tournament;
}

function assertMexicanoNotEnded(tournament: TournamentState): void {
  if (tournament.config.mode === "MEXICANO" && tournament.endedAt) {
    throw new Error("This Mexicano night has already ended.");
  }
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

function bumpGamesPlayed(players: Player[], match: Match, delta: number): void {
  for (const playerId of [...match.teamA, ...match.teamB]) {
    const player = players.find((item) => item.id === playerId);
    if (player) {
      player.gamesPlayed = Math.max(0, player.gamesPlayed + delta);
    }
  }
}

function applyRegularAward(
  players: Player[],
  match: Match,
  winner: Side,
  evaluation: {
    setsWonA: number;
    setsWonB: number;
    gamesWonA: number;
    gamesWonB: number;
  },
  sign: 1 | -1
): void {
  const { winner: winDelta, loser: loseDelta } = awardDeltasForWinner(winner, evaluation);
  const apply = (playerId: string, delta: typeof winDelta): void => {
    const player = players.find((item) => item.id === playerId);
    if (!player) {
      return;
    }
    player.matchesWon = (player.matchesWon ?? 0) + sign * delta.matchesWon;
    player.matchesLost = (player.matchesLost ?? 0) + sign * delta.matchesLost;
    player.setsWon = (player.setsWon ?? 0) + sign * delta.setsWon;
    player.setsLost = (player.setsLost ?? 0) + sign * delta.setsLost;
    player.gamesWon = (player.gamesWon ?? 0) + sign * delta.gamesWon;
    player.gamesLost = (player.gamesLost ?? 0) + sign * delta.gamesLost;
  };
  const winnerIds = winner === "A" ? match.teamA : match.teamB;
  const loserIds = winner === "A" ? match.teamB : match.teamA;
  for (const playerId of winnerIds) {
    apply(playerId, winDelta);
  }
  for (const playerId of loserIds) {
    apply(playerId, loseDelta);
  }
}

function buildLeaderboard(
  players: Player[],
  scoringMode?: TournamentConfig["scoringMode"]
): LeaderboardEntry[] {
  const regular = scoringMode === "REGULAR";
  return [...players]
    .sort((a, b) => {
      if (!regular) {
        return b.totalPoints - a.totalPoints;
      }
      const byMatches = (b.matchesWon ?? 0) - (a.matchesWon ?? 0);
      if (byMatches !== 0) {
        return byMatches;
      }
      const bySets = (b.setsWon ?? 0) - (a.setsWon ?? 0);
      if (bySets !== 0) {
        return bySets;
      }
      return (b.gamesWon ?? 0) - (a.gamesWon ?? 0);
    })
    .map((player, index) => ({
      playerId: player.id,
      name: player.name,
      totalPoints: player.totalPoints,
      gamesPlayed: player.gamesPlayed,
      rank: index + 1,
      matchesWon: player.matchesWon,
      matchesLost: player.matchesLost,
      setsWon: player.setsWon,
      setsLost: player.setsLost,
      gamesWon: player.gamesWon,
      gamesLost: player.gamesLost
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
    throw new Error(`Tournament ${id} not found.`);
  }
  return tournament;
}

/**
 * Generate a unique name by appending a number suffix if duplicates exist
 */
function generateUniqueName(baseName: string, existingNames: string[]): string {
  const trimmedBase = baseName.trim();

  // Check if the base name is already unique
  if (!existingNames.includes(trimmedBase)) {
    return trimmedBase;
  }

  // Find a unique suffix
  let counter = 1;
  let uniqueName: string;

  do {
    const suffix = counter.toString().padStart(2, "0");
    uniqueName = `${trimmedBase} ${suffix}`;
    counter += 1;
  } while (existingNames.includes(uniqueName) && counter < 100);

  return uniqueName;
}

export function addPendingPlayer(
  tournamentId: string,
  name: string,
  gender: "MALE" | "FEMALE" | undefined
): TournamentState {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Player name is required.");
  }

  const tournament = requireTournament(tournamentId);

  // Collect all existing names (both active players and pending players)
  const existingNames = [
    ...tournament.players.map((p) => p.name),
    ...tournament.pendingPlayers.map((p) => p.name)
  ];

  // Generate a unique name if duplicate exists
  const uniqueName = generateUniqueName(trimmedName, existingNames);

  const pendingPlayer: PendingPlayer = {
    id: createId("player"),
    name: uniqueName,
    gender,
    createdAt: new Date().toISOString()
  };

  tournament.pendingPlayers.push(pendingPlayer);
  touch(tournament);

  logger.info("store/addPendingPlayer", {
    tournamentId,
    playerId: pendingPlayer.id,
    originalName: trimmedName,
    finalName: uniqueName,
    wasDuplicate: trimmedName !== uniqueName,
    gender
  });

  return tournament;
}

export function integratePendingPlayers(tournamentId: string): TournamentState {
  const tournament = requireTournament(tournamentId);
  if (tournament.config.mode === "MEXICANO") {
    throw new Error("Pending player integration is not supported for Mexicano yet.");
  }

  // Validate integration eligibility
  const validation = canIntegratePlayers(tournament);
  if (!validation.can) {
    throw new Error(validation.reason || "Cannot integrate players");
  }

  // Calculate handicap for new players
  const avgGames = calculateAverageGames(tournament.players);
  const handicap = calculateHandicap(avgGames, 0.5);
  const newWave = tournament.integrationWaveCount + 1;

  // Convert pending players to active players
  const newPlayers: Player[] = tournament.pendingPlayers.map((pending) => ({
    id: pending.id,
    name: pending.name,
    gender: pending.gender,
    gamesPlayed: 0,
    totalPoints: 0,
    handicap,
    integrationWave: newWave
  }));

  // Add new players to tournament
  tournament.players.push(...newPlayers);

  // Clear pending players
  tournament.pendingPlayers = [];

  // Increment integration wave count
  tournament.integrationWaveCount = newWave;

  // Recalculate remaining rounds with expanded player list
  tournament.rounds = recalculateRemainingTournament(
    tournament.config,
    tournament.players,
    tournament.rounds
  );

  // Update leaderboard
  tournament.leaderboard = buildLeaderboard(tournament.players, tournament.config.scoringMode);

  touch(tournament);

  logger.info("store/integratePendingPlayers", {
    tournamentId,
    newPlayersCount: newPlayers.length,
    wave: newWave,
    handicap,
    totalPlayers: tournament.players.length
  });

  return tournament;
}

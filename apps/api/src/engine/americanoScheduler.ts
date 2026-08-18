import { createId } from "@padel/shared";
import type { FixedPair, Player, Round, TournamentConfig } from "@padel/shared";

import { buildRound } from "./constraintSolver.js";
import { createClassicPairingMatrices, seedClassicMatricesFromRounds } from "./pairingMatrices.js";
import { classicScheduleShape, courtsPerRound } from "./scheduleMath.js";
import {
  generateTeamAmericano,
  recalculateTeamAmericanoRemaining
} from "./teamAmericanoScheduler.js";

export interface ScheduledTournament {
  players: Player[];
  rounds: Round[];
  fixedPairs?: FixedPair[];
}

export function generateTournament(config: TournamentConfig): ScheduledTournament {
  if (config.variant === "TEAM") {
    return generateTeamAmericano(config);
  }

  const players: Player[] = config.players.map((input) => ({
    id: createId("player"),
    name: input.name,
    gender: input.gender,
    gamesPlayed: 0,
    totalPoints: 0
  }));
  const rounds = buildRounds(config, players);
  return { players, rounds };
}

export function recalculateRemainingTournament(
  config: TournamentConfig,
  players: Player[],
  existingRounds: Round[]
): Round[] {
  if (config.variant === "TEAM") {
    return recalculateTeamAmericanoRemaining(config, players, existingRounds);
  }

  const lockedRounds = existingRounds.filter((round) => round.isLocked);

  // Reset gamesPlayed to only count locked rounds
  for (const player of players) {
    player.gamesPlayed = countGamesInRounds(player.id, lockedRounds);
  }

  // Create working copies to avoid mutating originals during calculation
  const workingPlayers: Player[] = players.map((p) => ({ ...p }));

  // Generate exactly the rounds that will be kept, otherwise gamesPlayed counts
  // rounds that get discarded and fairness decisions drift.
  const totalRoundsNeeded = getTotalRounds(config, players.length);
  const unlockedRoundsNeeded = Math.max(0, totalRoundsNeeded - lockedRounds.length);
  const unlockedRounds = buildRounds(config, workingPlayers, lockedRounds, unlockedRoundsNeeded);

  // Update original players with final gamesPlayed from working copies
  for (const player of players) {
    const workingPlayer = workingPlayers.find((p) => p.id === player.id);
    if (workingPlayer) {
      player.gamesPlayed = workingPlayer.gamesPlayed;
    }
  }

  // Update round numbers to continue from where locked rounds left off
  const startingRoundNumber = lockedRounds.length + 1;
  for (let i = 0; i < unlockedRounds.length; i++) {
    unlockedRounds[i].roundNumber = startingRoundNumber + i;
  }

  return [...lockedRounds, ...unlockedRounds];
}

function countGamesInRounds(playerId: string, rounds: Round[]): number {
  let count = 0;
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.teamA.includes(playerId) || match.teamB.includes(playerId)) {
        count++;
      }
    }
  }
  return count;
}

function buildRounds(
  config: TournamentConfig,
  players: Player[],
  seedRounds: Round[] = [],
  roundLimit?: number
): Round[] {
  const matrices = createClassicPairingMatrices();
  seedClassicMatricesFromRounds(seedRounds, matrices);
  const { teammateMatrix, opponentMatrix, opponentTeamMatrix, coPlayerMatrix } = matrices;
  const rounds: Round[] = [];

  const shape = classicScheduleShape(config, players.length);
  const roundsToBuild = Math.min(shape.totalRounds, roundLimit ?? shape.totalRounds);
  // Take the tail of the plan so a short final round stays last when regenerating a remainder.
  const courts = courtsPerRound(shape).slice(shape.totalRounds - roundsToBuild);

  for (let roundNumber = 1; roundNumber <= roundsToBuild; roundNumber += 1) {
    const round = buildRound({
      roundNumber,
      courts: courts[roundNumber - 1] ?? shape.matchesPerRound,
      variant: config.variant,
      players,
      teammateMatrix,
      opponentMatrix,
      opponentTeamMatrix,
      coPlayerMatrix
    });
    if (round.matches.length === 0) {
      break;
    }
    for (const match of round.matches) {
      const allPlayers = [...match.teamA, ...match.teamB];
      for (const playerId of allPlayers) {
        const player = players.find((candidate) => candidate.id === playerId);
        if (player) {
          player.gamesPlayed += 1;
        }
      }
    }
    rounds.push(round);
  }

  return rounds;
}

function getTotalRounds(config: TournamentConfig, actualPlayerCount: number): number {
  return classicScheduleShape(config, actualPlayerCount).totalRounds;
}

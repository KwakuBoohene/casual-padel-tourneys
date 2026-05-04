import { createId } from "@padel/shared";
import type { Player, Round, TournamentConfig } from "@padel/shared";

import { buildRound } from "./constraintSolver.js";
import { estimateTournament } from "./timeEstimator.js";

export interface ScheduledTournament {
  players: Player[];
  rounds: Round[];
}

export function generateTournament(config: TournamentConfig): ScheduledTournament {
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
  const lockedRounds = existingRounds.filter((round) => round.isLocked);

  // Reset gamesPlayed to only count locked rounds
  for (const player of players) {
    player.gamesPlayed = countGamesInRounds(player.id, lockedRounds);
  }

  // Create working copies to avoid mutating originals during calculation
  const workingPlayers: Player[] = players.map((p) => ({ ...p }));

  const regeneratedRounds = buildRounds(config, workingPlayers);

  // Update original players with final gamesPlayed from working copies
  for (const player of players) {
    const workingPlayer = workingPlayers.find((p) => p.id === player.id);
    if (workingPlayer) {
      player.gamesPlayed = workingPlayer.gamesPlayed;
    }
  }

  return [...lockedRounds, ...regeneratedRounds.slice(lockedRounds.length)];
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

function buildRounds(config: TournamentConfig, players: Player[]): Round[] {
  const teammateMatrix = new Map<string, number>();
  const opponentMatrix = new Map<string, number>();
  const coPlayerMatrix = new Map<string, number>();
  const rounds: Round[] = [];

  const totalRounds = getTotalRounds(config, players.length);
  const courtsPerRound = getCourtsPerRound(config, totalRounds, players.length);

  for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
    const courtsThisRound = courtsPerRound[roundNumber - 1] ?? config.courts;
    const round = buildRound({
      roundNumber,
      courts: courtsThisRound,
      variant: config.variant,
      players,
      teammateMatrix,
      opponentMatrix,
      coPlayerMatrix
    });
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
  if (config.schedulingMode === "TARGET_GAMES") {
    const totalMatchesNeeded = Math.ceil((actualPlayerCount * (config.targetGamesPerPlayer ?? 4)) / 4);
    return Math.max(1, Math.ceil(totalMatchesNeeded / config.courts));
  }
  return estimateTournament(config).rounds;
}

function getCourtsPerRound(
  config: TournamentConfig,
  totalRounds: number,
  actualPlayerCount: number
): number[] {
  if (config.schedulingMode !== "TARGET_GAMES") {
    return Array(totalRounds).fill(config.courts);
  }
  const totalMatchesNeeded = Math.ceil((actualPlayerCount * (config.targetGamesPerPlayer ?? 4)) / 4);
  const result: number[] = [];
  for (let r = 0; r < totalRounds; r++) {
    const matchesSoFar = r * config.courts;
    const matchesLeft = totalMatchesNeeded - matchesSoFar;
    result.push(r < totalRounds - 1 ? config.courts : Math.max(1, Math.min(config.courts, matchesLeft)));
  }
  return result;
}

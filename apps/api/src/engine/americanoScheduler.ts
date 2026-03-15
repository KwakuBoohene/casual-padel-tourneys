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
  const regeneratedRounds = buildRounds(config, players);
  return [...lockedRounds, ...regeneratedRounds.slice(lockedRounds.length)];
}

function buildRounds(config: TournamentConfig, players: Player[]): Round[] {
  const teammateMatrix = new Map<string, number>();
  const opponentMatrix = new Map<string, number>();
  const coPlayerMatrix = new Map<string, number>();
  const rounds: Round[] = [];

  const totalRounds = getTotalRounds(config);
  const courtsPerRound = getCourtsPerRound(config, totalRounds);

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

function getTotalRounds(config: TournamentConfig): number {
  if (config.schedulingMode === "TARGET_GAMES") {
    const totalMatchesNeeded = Math.ceil(
      (config.players.length * (config.targetGamesPerPlayer ?? 4)) / 4
    );
    return Math.max(1, Math.ceil(totalMatchesNeeded / config.courts));
  }
  return estimateTournament(config).rounds;
}

function getCourtsPerRound(config: TournamentConfig, totalRounds: number): number[] {
  if (config.schedulingMode !== "TARGET_GAMES") {
    return Array(totalRounds).fill(config.courts);
  }
  const totalMatchesNeeded = Math.ceil(
    (config.players.length * (config.targetGamesPerPlayer ?? 4)) / 4
  );
  const result: number[] = [];
  for (let r = 0; r < totalRounds; r++) {
    const matchesSoFar = r * config.courts;
    const matchesLeft = totalMatchesNeeded - matchesSoFar;
    result.push(r < totalRounds - 1 ? config.courts : Math.max(1, Math.min(config.courts, matchesLeft)));
  }
  return result;
}

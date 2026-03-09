import { createId } from "@padel/shared";
import type { Player, Round, TournamentConfig } from "@padel/shared";

import { buildRound } from "./constraintSolver.js";
import { estimateTournament } from "./timeEstimator.js";

export interface ScheduledTournament {
  players: Player[];
  rounds: Round[];
}

export function generateTournament(config: TournamentConfig): ScheduledTournament {
  const players: Player[] = config.players.map((name) => ({
    id: createId("player"),
    name,
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
  const estimate = estimateTournament(config);
  const teammateMatrix = new Map<string, number>();
  const opponentMatrix = new Map<string, number>();
  const rounds: Round[] = [];

  for (let roundNumber = 1; roundNumber <= estimate.rounds; roundNumber += 1) {
    const round = buildRound({
      roundNumber,
      courts: config.courts,
      players,
      teammateMatrix,
      opponentMatrix
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

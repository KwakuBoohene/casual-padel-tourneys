import type { TournamentConfig } from "@padel/shared";

import { estimateTournament } from "./timeEstimator.js";

/**
 * Americano never repeats an opponent team, so the schedule length is bounded by how many
 * distinct matchups exist — not just by courts and target games.
 */

export interface ScheduleShape {
  /** Matches that can run simultaneously (courts capped by how many units exist). */
  matchesPerRound: number;
  /** Total matches the whole event should schedule. */
  totalMatches: number;
  /** Rounds needed to fit `totalMatches` at `matchesPerRound` per round. */
  totalRounds: number;
}

function combinations2(n: number): number {
  return n < 2 ? 0 : (n * (n - 1)) / 2;
}

/** Distinct pair-vs-pair matchups available to a Team Americano field. */
export function teamMatchupCapacity(teamCount: number): number {
  return combinations2(teamCount);
}

/**
 * Distinct opponent teams a single Classic Americano player can face: any pair drawn from
 * the other players. This caps games per player before a rematch becomes unavoidable.
 */
export function classicGamesCapacity(playerCount: number): number {
  return combinations2(Math.max(0, playerCount - 1));
}

export function teamScheduleShape(config: TournamentConfig, teamCount: number): ScheduleShape {
  const matchesPerRound = Math.max(1, Math.min(config.courts, Math.floor(teamCount / 2)));
  const capacity = teamMatchupCapacity(teamCount);

  if (config.schedulingMode === "ROUND_ROBIN") {
    return shapeFromMatches(capacity, matchesPerRound);
  }
  if (config.schedulingMode === "TARGET_GAMES") {
    const target = Math.min(config.targetGamesPerPlayer ?? 4, Math.max(1, teamCount - 1));
    const wanted = Math.ceil((teamCount * target) / 2);
    return shapeFromMatches(Math.min(wanted, capacity), matchesPerRound);
  }
  const timedRounds = estimateTournament(config).rounds;
  return shapeFromMatches(Math.min(timedRounds * matchesPerRound, capacity), matchesPerRound);
}

export function classicScheduleShape(config: TournamentConfig, playerCount: number): ScheduleShape {
  const matchesPerRound = Math.max(1, Math.min(config.courts, Math.floor(playerCount / 4)));

  if (config.schedulingMode === "ROUND_ROBIN") {
    // "Everyone plays everyone": every partnership happens once, and each match burns two of them.
    const partnerships = combinations2(playerCount);
    return shapeFromMatches(Math.ceil(partnerships / 2), matchesPerRound);
  }
  if (config.schedulingMode === "TARGET_GAMES") {
    const target = Math.min(
      config.targetGamesPerPlayer ?? 4,
      Math.max(1, classicGamesCapacity(playerCount))
    );
    return shapeFromMatches(Math.ceil((playerCount * target) / 4), matchesPerRound);
  }
  const timedRounds = estimateTournament(config).rounds;
  const capacityMatches = Math.ceil((playerCount * classicGamesCapacity(playerCount)) / 4);
  return shapeFromMatches(Math.min(timedRounds * matchesPerRound, capacityMatches), matchesPerRound);
}

function shapeFromMatches(totalMatches: number, matchesPerRound: number): ScheduleShape {
  const matches = Math.max(1, totalMatches);
  return {
    matchesPerRound,
    totalMatches: matches,
    totalRounds: Math.max(1, Math.ceil(matches / matchesPerRound))
  };
}

/** Per-round court counts; the final round runs short when matches do not divide evenly. */
export function courtsPerRound(shape: ScheduleShape): number[] {
  const result: number[] = [];
  let remaining = shape.totalMatches;
  for (let round = 0; round < shape.totalRounds; round += 1) {
    const courts = Math.max(1, Math.min(shape.matchesPerRound, remaining));
    result.push(courts);
    remaining -= courts;
  }
  return result;
}

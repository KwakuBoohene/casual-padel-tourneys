import { createId } from "@padel/shared";
import type { FixedPair, Match, Player, Round, TournamentConfig } from "@padel/shared";

import { estimateTournament } from "./timeEstimator.js";

export interface TeamAmericanoScheduled {
  players: Player[];
  rounds: Round[];
  fixedPairs: FixedPair[];
}

/**
 * Team Americano: fixed doubles pairs for the whole event.
 * Unlike Classic Americano, partners never rotate. Units are pairs; each court
 * is pair vs pair. Soft goal: balance games and minimize repeated pair matchups.
 * (Team Mexicano instead ladders pairs by standings after each round.)
 */
export function generateTeamAmericano(config: TournamentConfig): TeamAmericanoScheduled {
  const { players, fixedPairs } = materializeFixedPairs(config);
  const rounds = buildTeamAmericanoRounds(config, players, fixedPairs);
  return { players, rounds, fixedPairs };
}

export function recalculateTeamAmericanoRemaining(
  config: TournamentConfig,
  players: Player[],
  existingRounds: Round[],
  fixedPairs?: FixedPair[]
): Round[] {
  const pairs = fixedPairs && fixedPairs.length > 0 ? fixedPairs : fixedPairsFromPlayers(players);
  if (pairs.length === 0) {
    throw new Error("Team Americano requires fixed pairs.");
  }

  const lockedRounds = existingRounds.filter((round) => round.isLocked);
  for (const player of players) {
    player.gamesPlayed = countGamesInRounds(player.id, lockedRounds);
  }

  const workingPlayers: Player[] = players.map((player) => ({ ...player }));
  const regenerated = buildTeamAmericanoRounds(config, workingPlayers, pairs);

  for (const player of players) {
    const working = workingPlayers.find((candidate) => candidate.id === player.id);
    if (working) {
      player.gamesPlayed = working.gamesPlayed;
    }
  }

  const totalRoundsNeeded = getTotalRounds(config, players.length, pairs.length);
  const unlockedRoundsNeeded = Math.max(0, totalRoundsNeeded - lockedRounds.length);
  const unlockedRounds = regenerated.slice(0, unlockedRoundsNeeded);
  const startingRoundNumber = lockedRounds.length + 1;
  for (let i = 0; i < unlockedRounds.length; i += 1) {
    unlockedRounds[i].roundNumber = startingRoundNumber + i;
  }
  return [...lockedRounds, ...unlockedRounds];
}

function materializeFixedPairs(config: TournamentConfig): {
  players: Player[];
  fixedPairs: FixedPair[];
} {
  const teamsInput = config.teams ?? [];
  if (teamsInput.length === 0) {
    throw new Error("Team Americano requires fixed teams.");
  }

  const players: Player[] = [];
  const fixedPairs: FixedPair[] = [];
  for (const team of teamsInput) {
    const pairId = createId("pair");
    const playerA: Player = {
      id: createId("player"),
      name: team.playerA.name,
      gender: team.playerA.gender,
      gamesPlayed: 0,
      totalPoints: 0,
      pairId
    };
    const playerB: Player = {
      id: createId("player"),
      name: team.playerB.name,
      gender: team.playerB.gender,
      gamesPlayed: 0,
      totalPoints: 0,
      pairId
    };
    players.push(playerA, playerB);
    fixedPairs.push({
      id: pairId,
      playerAId: playerA.id,
      playerBId: playerB.id,
      name: team.name
    });
  }
  return { players, fixedPairs };
}

function buildTeamAmericanoRounds(
  config: TournamentConfig,
  players: Player[],
  fixedPairs: FixedPair[]
): Round[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  const opponentMatrix = new Map<string, number>();
  const rounds: Round[] = [];
  const totalRounds = getTotalRounds(config, players.length, fixedPairs.length);
  const courtsPerRound = getCourtsPerRound(config, totalRounds, players.length);

  for (let roundNumber = 1; roundNumber <= totalRounds; roundNumber += 1) {
    const courtsThisRound = courtsPerRound[roundNumber - 1] ?? config.courts;
    const matchSlots = Math.min(courtsThisRound, Math.floor(fixedPairs.length / 2));
    const selected = selectPairsForRound(fixedPairs, byId, matchSlots * 2);
    const pairings = bestPairMatchups(selected, opponentMatrix);
    const matches: Match[] = pairings.map((pairing, index) => {
      bumpOpponent(opponentMatrix, pairing[0].id, pairing[1].id);
      return {
        id: createId("match"),
        round: roundNumber,
        court: index + 1,
        teamA: [pairing[0].playerAId, pairing[0].playerBId],
        teamB: [pairing[1].playerAId, pairing[1].playerBId],
        completed: false
      };
    });

    for (const match of matches) {
      for (const playerId of [...match.teamA, ...match.teamB]) {
        const player = byId.get(playerId);
        if (player) {
          player.gamesPlayed += 1;
        }
      }
    }

    rounds.push({
      id: createId("round"),
      roundNumber,
      matches,
      isLocked: false
    });
  }

  return rounds;
}

function selectPairsForRound(
  fixedPairs: FixedPair[],
  byId: Map<string, Player>,
  count: number
): FixedPair[] {
  const remaining = [...fixedPairs];
  const selected: FixedPair[] = [];

  while (selected.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const games = pairGamesPlayed(candidate, byId);
      const score = games * 100 + index;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    const [chosen] = remaining.splice(bestIndex, 1);
    selected.push(chosen);
  }
  return selected;
}

/** Lowest total opponent-repeat cost among perfect matchings of an even pair list. */
function bestPairMatchups(
  pairs: FixedPair[],
  opponentMatrix: Map<string, number>
): Array<[FixedPair, FixedPair]> {
  if (pairs.length < 2) {
    return [];
  }
  const byId = new Map(pairs.map((pair) => [pair.id, pair]));
  const ids = pairs.map((pair) => pair.id);
  let best: Array<[string, string]> | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  for (const matching of enumeratePerfectMatchings(ids)) {
    let cost = 0;
    for (const [a, b] of matching) {
      cost += opponentMatrix.get(pairKey(a, b)) ?? 0;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = matching;
    }
  }

  return (best ?? []).map(([a, b]) => [byId.get(a)!, byId.get(b)!]);
}

function enumeratePerfectMatchings(ids: string[]): Array<Array<[string, string]>> {
  if (ids.length === 0) {
    return [[]];
  }
  if (ids.length % 2 !== 0) {
    return enumeratePerfectMatchings(ids.slice(0, ids.length - 1));
  }
  const [first, ...rest] = ids;
  const results: Array<Array<[string, string]>> = [];
  for (let i = 0; i < rest.length; i += 1) {
    const partner = rest[i];
    const remaining = [...rest.slice(0, i), ...rest.slice(i + 1)];
    for (const matching of enumeratePerfectMatchings(remaining)) {
      results.push([[first, partner], ...matching]);
    }
  }
  return results;
}

function pairGamesPlayed(pair: FixedPair, byId: Map<string, Player>): number {
  const a = byId.get(pair.playerAId)?.gamesPlayed ?? 0;
  const b = byId.get(pair.playerBId)?.gamesPlayed ?? 0;
  return Math.max(a, b);
}

function bumpOpponent(matrix: Map<string, number>, a: string, b: string): void {
  const key = pairKey(a, b);
  matrix.set(key, (matrix.get(key) ?? 0) + 1);
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function getTotalRounds(config: TournamentConfig, playerCount: number, teamCount: number): number {
  if (config.schedulingMode === "ROUND_ROBIN") {
    return Math.max(1, teamCount - 1);
  }
  if (config.schedulingMode === "TARGET_GAMES") {
    const totalMatchesNeeded = Math.ceil((playerCount * (config.targetGamesPerPlayer ?? 4)) / 4);
    return Math.max(1, Math.ceil(totalMatchesNeeded / config.courts));
  }
  return estimateTournament(config).rounds;
}

function getCourtsPerRound(
  config: TournamentConfig,
  totalRounds: number,
  playerCount: number
): number[] {
  if (config.schedulingMode !== "TARGET_GAMES") {
    return Array(totalRounds).fill(config.courts);
  }
  const totalMatchesNeeded = Math.ceil((playerCount * (config.targetGamesPerPlayer ?? 4)) / 4);
  const result: number[] = [];
  for (let r = 0; r < totalRounds; r += 1) {
    const matchesSoFar = r * config.courts;
    const matchesLeft = totalMatchesNeeded - matchesSoFar;
    result.push(r < totalRounds - 1 ? config.courts : Math.max(1, Math.min(config.courts, matchesLeft)));
  }
  return result;
}

function countGamesInRounds(playerId: string, rounds: Round[]): number {
  let count = 0;
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.teamA.includes(playerId) || match.teamB.includes(playerId)) {
        count += 1;
      }
    }
  }
  return count;
}

export function fixedPairsFromPlayers(players: Player[]): FixedPair[] {
  const byPair = new Map<string, Player[]>();
  for (const player of players) {
    if (!player.pairId) continue;
    const group = byPair.get(player.pairId) ?? [];
    group.push(player);
    byPair.set(player.pairId, group);
  }
  const pairs: FixedPair[] = [];
  for (const [pairId, group] of byPair) {
    if (group.length < 2) continue;
    pairs.push({ id: pairId, playerAId: group[0].id, playerBId: group[1].id });
  }
  return pairs;
}

import { createId } from "@padel/shared";
import type { FixedPair, Match, Player, Round, TournamentConfig } from "@padel/shared";

import { seedTeamOpponentMatrixFromRounds, teamPairKey } from "./pairingMatrices.js";
import { teamScheduleShape } from "./scheduleMath.js";

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
  const lockedMatches = lockedRounds.reduce((sum, round) => sum + round.matches.length, 0);
  const unlockedRounds = buildTeamAmericanoRounds(config, workingPlayers, pairs, lockedRounds, lockedMatches);

  for (const player of players) {
    const working = workingPlayers.find((candidate) => candidate.id === player.id);
    if (working) {
      player.gamesPlayed = working.gamesPlayed;
    }
  }

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

/**
 * The whole event is planned as a list of distinct matchups first (circle method, so every pair
 * meets exactly once and in a balanced order), then packed into rounds a court at a time. Because
 * the plan only ever contains unplayed matchups, a rematch is structurally impossible.
 */
function buildTeamAmericanoRounds(
  config: TournamentConfig,
  players: Player[],
  fixedPairs: FixedPair[],
  seedRounds: Round[] = [],
  alreadyScheduledMatches = 0
): Round[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  const pairById = new Map(fixedPairs.map((pair) => [pair.id, pair]));
  const pairIdByPlayerId = new Map<string, string>();
  for (const pair of fixedPairs) {
    pairIdByPlayerId.set(pair.playerAId, pair.id);
    pairIdByPlayerId.set(pair.playerBId, pair.id);
  }
  const played = seedTeamOpponentMatrixFromRounds(seedRounds, (playerId) =>
    pairIdByPlayerId.get(playerId)
  );

  const shape = teamScheduleShape(config, fixedPairs.length);
  const wanted = Math.max(0, shape.totalMatches - alreadyScheduledMatches);
  const plan = circleMatchupOrder(fixedPairs.map((pair) => pair.id))
    .filter((matchup) => (played.get(teamPairKey(matchup[0], matchup[1])) ?? 0) === 0)
    .slice(0, wanted);

  const rounds: Round[] = [];
  let roundNumber = 1;
  while (plan.length > 0) {
    const used = new Set<string>();
    const picked: Array<[string, string]> = [];
    for (let index = 0; index < plan.length && picked.length < shape.matchesPerRound; index += 1) {
      const [a, b] = plan[index];
      if (used.has(a) || used.has(b)) {
        continue;
      }
      used.add(a);
      used.add(b);
      picked.push(plan[index]);
      plan.splice(index, 1);
      index -= 1;
    }
    if (picked.length === 0) {
      break;
    }

    const matches: Match[] = picked.map(([a, b], index) => {
      const pairA = pairById.get(a)!;
      const pairB = pairById.get(b)!;
      return {
        id: createId("match"),
        round: roundNumber,
        court: index + 1,
        teamA: [pairA.playerAId, pairA.playerBId],
        teamB: [pairB.playerAId, pairB.playerBId],
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

    rounds.push({ id: createId("round"), roundNumber, matches, isLocked: false });
    roundNumber += 1;
  }

  return rounds;
}

/**
 * Circle ("Berger table") rotation: one full pass over the list gives every pair exactly once,
 * grouped so each rotation step covers every team. Taking a prefix therefore stays balanced.
 */
function circleMatchupOrder(pairIds: string[]): Array<[string, string]> {
  const wheel = [...pairIds];
  const bye = "__bye__";
  if (wheel.length % 2 !== 0) {
    wheel.push(bye);
  }
  const size = wheel.length;
  const matchups: Array<[string, string]> = [];
  if (size < 2) {
    return matchups;
  }

  for (let step = 0; step < size - 1; step += 1) {
    for (let slot = 0; slot < size / 2; slot += 1) {
      const home = wheel[slot];
      const away = wheel[size - 1 - slot];
      if (home !== bye && away !== bye) {
        matchups.push([home, away]);
      }
    }
    // Rotate everything except the first entry.
    wheel.splice(1, 0, wheel.pop()!);
  }
  return matchups;
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

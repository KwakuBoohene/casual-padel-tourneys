import assert from "node:assert/strict";
import test from "node:test";

import { sortMexicanoStandings } from "@padel/shared";
import type { Player, Round, TournamentConfig } from "@padel/shared";

import {
  buildNextMexicanoRound,
  generateMexicano
} from "../../src/engine/mexicanoScheduler.js";

interface RoundLog {
  round: Round;
  /** Player ids in table order at the moment this round was generated (empty for the lottery). */
  tableBefore: string[];
}

interface NightResult {
  players: Player[];
  log: RoundLog[];
}

/** Identity shuffle so the lottery round is reproducible. */
function fixedRandom(): () => number {
  return () => 0;
}

function tableOrder(players: Player[]): string[] {
  return sortMexicanoStandings(
    players.map((player) => ({
      playerId: player.id,
      totalPoints: player.totalPoints,
      gamesPlayed: player.gamesPlayed
    }))
  ).map((row) => row.playerId);
}

/**
 * Resolve a round with a deterministic result: the stronger side (by seeded skill) wins 16-8.
 * Skill is unique per player so the table keeps a stable shape between rounds.
 */
function playRound(players: Player[], round: Round, skill: Map<string, number>): void {
  const byId = new Map(players.map((player) => [player.id, player]));
  for (const match of round.matches) {
    const strength = (side: readonly string[]) =>
      side.reduce((sum, id) => sum + (skill.get(id) ?? 0), 0);
    const scoreA = strength(match.teamA) >= strength(match.teamB) ? 16 : 8;
    const award = (side: readonly string[], score: number) => {
      for (const id of side) {
        const player = byId.get(id)!;
        player.totalPoints += score;
        player.gamesPlayed += 1;
      }
    };
    award(match.teamA, scoreA);
    award(match.teamB, 24 - scoreA);
    match.completed = true;
    match.scoreA = scoreA;
    match.scoreB = 24 - scoreA;
  }
}

function runNight(options: { config: TournamentConfig; rounds: number }): NightResult {
  const { variant, courts } = options.config;
  const { players, rounds, fixedPairs } = generateMexicano(options.config, {
    random: fixedRandom()
  });
  // Highest skill goes to the first player so the seeded table order is predictable.
  const skill = new Map(players.map((player, index) => [player.id, players.length - index]));

  const log: RoundLog[] = [{ round: rounds[0], tableBefore: [] }];
  playRound(players, rounds[0], skill);

  for (let roundNumber = 2; roundNumber <= options.rounds; roundNumber += 1) {
    const tableBefore = tableOrder(players);
    const next = buildNextMexicanoRound({ players, courts, variant, roundNumber, fixedPairs });
    log.push({ round: next, tableBefore });
    playRound(players, next, skill);
  }

  return { players, log };
}

function participantsOf(round: Round): Set<string> {
  return new Set(round.matches.flatMap((match) => [...match.teamA, ...match.teamB]));
}

function classicConfig(playerCount: number, courts: number): TournamentConfig {
  return {
    name: "Mexicano",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: Array.from({ length: playerCount }, (_, i) => ({ name: `P${i + 1}` })),
    courts,
    pointsPerMatch: 24,
    tournamentTimeMinutes: 120
  };
}

test("16 players on 2 courts: rounds 1 and 2 cover everyone exactly once", () => {
  const { players, log } = runNight({ config: classicConfig(16, 2), rounds: 2 });

  const first = participantsOf(log[0].round);
  const second = participantsOf(log[1].round);
  assert.equal(first.size, 8);
  assert.equal(second.size, 8);
  for (const id of second) {
    assert.equal(first.has(id), false, "round 2 must be the players who sat out round 1");
  }
  for (const player of players) {
    assert.equal(player.gamesPlayed, 1);
  }
});

test("16 players on 2 courts: round 3 is the top half, round 4 the bottom half", () => {
  const { players, log } = runNight({ config: classicConfig(16, 2), rounds: 4 });

  const tableAfterTwo = log[2].tableBefore;
  const third = participantsOf(log[2].round);
  const fourth = participantsOf(log[3].round);

  assert.deepEqual(
    [...third].sort(),
    tableAfterTwo.slice(0, 8).sort(),
    "round 3 should be the eight best of the field"
  );
  assert.deepEqual(
    [...fourth].sort(),
    tableAfterTwo.slice(8).sort(),
    "round 4 should be the eight worst of the field"
  );
  for (const player of players) {
    assert.equal(player.gamesPlayed, 2);
  }
});

test("16 players on 2 courts: the best four share court 1 once everyone has played", () => {
  const { log } = runNight({ config: classicConfig(16, 2), rounds: 3 });

  const table = log[2].tableBefore;
  const courtOne = log[2].round.matches[0];
  assert.deepEqual(courtOne.teamA, [table[0], table[2]]);
  assert.deepEqual(courtOne.teamB, [table[1], table[3]]);
});

test("oversubscribed fields never drift more than one game apart", () => {
  const fields: Array<[number, number]> = [
    [10, 2],
    [12, 2],
    [13, 3],
    [16, 2],
    [20, 3],
    [24, 4]
  ];
  for (const [playerCount, courts] of fields) {
    const { players } = runNight({ config: classicConfig(playerCount, courts), rounds: 9 });
    const games = players.map((player) => player.gamesPlayed);
    const delta = Math.max(...games) - Math.min(...games);
    assert.ok(
      delta <= 1,
      `${playerCount} players on ${courts} courts drifted by ${delta} games`
    );
  }
});

test("a player is never held out two rounds in a row while others keep playing", () => {
  const { players, log } = runNight({ config: classicConfig(10, 2), rounds: 8 });
  const seatedStreak = new Map(players.map((player) => [player.id, 0]));

  for (const entry of log) {
    const playing = participantsOf(entry.round);
    for (const player of players) {
      const streak = playing.has(player.id) ? 0 : (seatedStreak.get(player.id) ?? 0) + 1;
      seatedStreak.set(player.id, streak);
      assert.ok(streak <= 1, `${player.name} sat out ${streak} rounds in a row`);
    }
  }
});

test("evenly sized fields still follow the plain ladder every round", () => {
  const { players, log } = runNight({ config: classicConfig(8, 2), rounds: 5 });
  for (const entry of log.slice(1)) {
    assert.equal(participantsOf(entry.round).size, 8);
    const table = entry.tableBefore;
    assert.deepEqual(entry.round.matches[0].teamA, [table[0], table[2]]);
    assert.deepEqual(entry.round.matches[0].teamB, [table[1], table[3]]);
    assert.deepEqual(entry.round.matches[1].teamA, [table[4], table[6]]);
    assert.deepEqual(entry.round.matches[1].teamB, [table[5], table[7]]);
  }
  for (const player of players) {
    assert.equal(player.gamesPlayed, 5);
  }
});

test("Team Mexicano rotates resting pairs before ranking them", () => {
  const teams = Array.from({ length: 6 }, (_, i) => ({
    name: `T${i + 1}`,
    playerA: { name: `T${i + 1}a` },
    playerB: { name: `T${i + 1}b` }
  }));
  const config: TournamentConfig = {
    ...classicConfig(12, 2),
    variant: "TEAM",
    players: teams.flatMap((team) => [team.playerA, team.playerB]),
    teams
  };

  const { players, log } = runNight({ config, rounds: 3 });

  const first = participantsOf(log[0].round);
  const second = participantsOf(log[1].round);
  assert.equal(first.size, 8);
  assert.equal(second.size, 8);

  const restedFirst = players.filter((player) => !first.has(player.id));
  assert.equal(restedFirst.length, 4);
  for (const player of restedFirst) {
    assert.equal(second.has(player.id), true, "pairs that rested must play the next round");
  }

  const games = players.map((player) => player.gamesPlayed);
  assert.ok(Math.max(...games) - Math.min(...games) <= 1);
});

test("Team Mexicano keeps partners together across rotated rounds", () => {
  const teams = Array.from({ length: 5 }, (_, i) => ({
    name: `T${i + 1}`,
    playerA: { name: `T${i + 1}a` },
    playerB: { name: `T${i + 1}b` }
  }));
  const config: TournamentConfig = {
    ...classicConfig(10, 2),
    variant: "TEAM",
    players: teams.flatMap((team) => [team.playerA, team.playerB]),
    teams
  };

  const { players, log } = runNight({ config, rounds: 6 });
  const pairOf = new Map(players.map((player) => [player.id, player.pairId]));

  for (const entry of log) {
    for (const match of entry.round.matches) {
      assert.equal(pairOf.get(match.teamA[0]), pairOf.get(match.teamA[1]));
      assert.equal(pairOf.get(match.teamB[0]), pairOf.get(match.teamB[1]));
      assert.notEqual(pairOf.get(match.teamA[0]), pairOf.get(match.teamB[0]));
    }
  }

  const games = players.map((player) => player.gamesPlayed);
  assert.ok(Math.max(...games) - Math.min(...games) <= 1);
});

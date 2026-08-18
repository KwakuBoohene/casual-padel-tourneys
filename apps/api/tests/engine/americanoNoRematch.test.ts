import test from "node:test";
import assert from "node:assert/strict";

import type { Player, Round, TournamentConfig } from "@padel/shared";

import {
  generateTournament,
  recalculateRemainingTournament
} from "../../src/engine/americanoScheduler.js";
import { maxGamesDelta } from "../../src/engine/fairnessEvaluator.js";

/**
 * Americano's core promise: you meet as many different opponents as possible and never face
 * the same opposing team twice. These tests lock that in across every scheduling mode.
 */

function teamKey(ids: readonly string[]): string {
  return [...ids].sort().join("+");
}

interface RematchReport {
  rematches: string[];
  opponentsFaced: Map<string, Set<string>>;
  gamesPlayed: Map<string, number>;
}

/** Walks the schedule and records every time a player meets an opposing pair they already met. */
function inspect(rounds: Round[]): RematchReport {
  const opponentsFaced = new Map<string, Set<string>>();
  const gamesPlayed = new Map<string, number>();
  const rematches: string[] = [];

  const seenBy = (playerId: string) => {
    const existing = opponentsFaced.get(playerId);
    if (existing) return existing;
    const created = new Set<string>();
    opponentsFaced.set(playerId, created);
    return created;
  };

  for (const round of rounds) {
    for (const match of round.matches) {
      const sides: Array<[readonly string[], readonly string[]]> = [
        [match.teamA, match.teamB],
        [match.teamB, match.teamA]
      ];
      for (const [side, opponents] of sides) {
        const opponentKey = teamKey(opponents);
        for (const playerId of side) {
          const faced = seenBy(playerId);
          if (faced.has(opponentKey)) {
            rematches.push(`R${round.roundNumber}: ${playerId} faced ${opponentKey} again`);
          }
          faced.add(opponentKey);
          gamesPlayed.set(playerId, (gamesPlayed.get(playerId) ?? 0) + 1);
        }
      }
    }
  }

  return { rematches, opponentsFaced, gamesPlayed };
}

function assertNoRematches(rounds: Round[], label: string): RematchReport {
  const report = inspect(rounds);
  assert.deepEqual(report.rematches, [], `${label} must never repeat an opponent team`);
  return report;
}

function playersOf(count: number): { name: string }[] {
  return Array.from({ length: count }, (_, index) => ({ name: `P${index + 1}` }));
}

function teamsOf(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    playerA: { name: `T${index + 1}a` },
    playerB: { name: `T${index + 1}b` },
    name: `Team ${index + 1}`
  }));
}

function classicConfig(overrides: Partial<TournamentConfig> & { players: { name: string }[] }): TournamentConfig {
  return {
    name: "Classic",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4,
    ...overrides
  };
}

function teamConfig(teamCount: number, overrides?: Partial<TournamentConfig>): TournamentConfig {
  const teams = teamsOf(teamCount);
  return {
    name: "Team",
    mode: "AMERICANO",
    variant: "TEAM",
    schedulingMode: "ROUND_ROBIN",
    players: teams.flatMap((team) => [team.playerA, team.playerB]),
    teams,
    courts: 2,
    pointsPerMatch: 24,
    ...overrides
  };
}

// ========== Team Americano ==========

for (const teamCount of [4, 6, 8, 10]) {
  for (const courts of [1, 2, 3]) {
    test(`team round robin: ${teamCount} teams on ${courts} courts plays every matchup once`, () => {
      const config = teamConfig(teamCount, { schedulingMode: "ROUND_ROBIN", courts });
      const { rounds, fixedPairs } = generateTournament(config);
      const report = assertNoRematches(rounds, `Team RR ${teamCount}x${courts}`);

      const expectedMatches = (teamCount * (teamCount - 1)) / 2;
      const actualMatches = rounds.reduce((sum, round) => sum + round.matches.length, 0);
      assert.equal(actualMatches, expectedMatches, "round robin must schedule every matchup");

      for (const pair of fixedPairs!) {
        const faced = report.opponentsFaced.get(pair.playerAId);
        assert.equal(faced?.size, teamCount - 1, "every team must face every other team exactly once");
      }
    });
  }
}

test("team target games caps at the number of available opponents", () => {
  // Four teams can only play three distinct opponents, so a target of 6 must not invent rematches.
  const config = teamConfig(4, { schedulingMode: "TARGET_GAMES", targetGamesPerPlayer: 6, courts: 2 });
  const { rounds, fixedPairs } = generateTournament(config);
  assertNoRematches(rounds, "Team TARGET_GAMES over capacity");

  const actualMatches = rounds.reduce((sum, round) => sum + round.matches.length, 0);
  assert.equal(actualMatches, 6, "four teams have exactly six matchups");
  assert.equal(fixedPairs!.length, 4);
});

test("team target games below capacity still avoids rematches", () => {
  const config = teamConfig(8, { schedulingMode: "TARGET_GAMES", targetGamesPerPlayer: 3, courts: 2 });
  const { players, rounds } = generateTournament(config);
  const report = assertNoRematches(rounds, "Team TARGET_GAMES");

  for (const player of players) {
    const games = report.gamesPlayed.get(player.id) ?? 0;
    assert.ok(games >= 2 && games <= 4, `expected roughly 3 games, got ${games}`);
  }
});

test("team timed events stop scheduling once every matchup is used", () => {
  // 90 minutes at 24 points/match asks for far more rounds than four teams can supply.
  const config = teamConfig(4, {
    schedulingMode: "TOTAL_TIME",
    tournamentTimeMinutes: 240,
    courts: 1
  });
  const { rounds } = generateTournament(config);
  assertNoRematches(rounds, "Team TOTAL_TIME");
  assert.equal(rounds.reduce((sum, round) => sum + round.matches.length, 0), 6);
});

test("team schedule survives a mid-event court change without rematches", () => {
  const config = teamConfig(8, { schedulingMode: "ROUND_ROBIN", courts: 2 });
  const generated = generateTournament(config);
  for (let index = 0; index < 4; index += 1) {
    generated.rounds[index].isLocked = true;
  }
  const lockedSignature = generated.rounds
    .slice(0, 4)
    .flatMap((round) => round.matches.map((match) => `${teamKey(match.teamA)}|${teamKey(match.teamB)}`));

  const recalculated = recalculateRemainingTournament(
    { ...config, courts: 3 },
    generated.players,
    generated.rounds
  );

  assertNoRematches(recalculated, "Team recalculated");
  const keptSignature = recalculated
    .slice(0, 4)
    .flatMap((round) => round.matches.map((match) => `${teamKey(match.teamA)}|${teamKey(match.teamB)}`));
  assert.deepEqual(keptSignature, lockedSignature, "locked rounds must be preserved verbatim");
});

// ========== Classic Americano ==========

for (const playerCount of [8, 12, 16]) {
  for (const courts of [1, 2]) {
    test(`classic target games: ${playerCount} players on ${courts} courts never repeats an opponent team`, () => {
      const config = classicConfig({
        players: playersOf(playerCount),
        courts,
        targetGamesPerPlayer: 4
      });
      const { players, rounds } = generateTournament(config);
      assertNoRematches(rounds, `Classic ${playerCount}x${courts}`);
      assert.ok(maxGamesDelta(players) <= 1, "games must stay balanced");
    });
  }
}

test("classic round robin gives everyone the same number of games", () => {
  const config = classicConfig({
    players: playersOf(8),
    schedulingMode: "ROUND_ROBIN",
    courts: 2
  });
  const { players, rounds } = generateTournament(config);
  const report = assertNoRematches(rounds, "Classic ROUND_ROBIN");

  // C(8,2) = 28 partnerships, two per match => 14 matches.
  assert.equal(rounds.reduce((sum, round) => sum + round.matches.length, 0), 14);
  for (const player of players) {
    assert.equal(report.gamesPlayed.get(player.id), 7, "everyone plays the same number of games");
  }
});

test("classic timed events never repeat an opponent team", () => {
  const config = classicConfig({
    players: playersOf(12),
    schedulingMode: "TOTAL_TIME",
    tournamentTimeMinutes: 180,
    courts: 2
  });
  const { rounds } = generateTournament(config);
  assertNoRematches(rounds, "Classic TOTAL_TIME");
});

test("classic eight-player field spreads opponents around", () => {
  const config = classicConfig({ players: playersOf(8), courts: 2, targetGamesPerPlayer: 4 });
  const { players, rounds } = generateTournament(config);
  const report = assertNoRematches(rounds, "Classic opponent spread");

  for (const player of players) {
    const faced = report.opponentsFaced.get(player.id) ?? new Set<string>();
    assert.equal(faced.size, report.gamesPlayed.get(player.id), "every match is a new opposing pair");
  }
});

test("classic four-player field stops before it would force a rematch", () => {
  // Four players can only be split three ways, so a target of 6 cannot be honoured.
  const config = classicConfig({ players: playersOf(4), courts: 1, targetGamesPerPlayer: 6 });
  const { rounds } = generateTournament(config);
  assertNoRematches(rounds, "Classic four players");
  assert.equal(rounds.reduce((sum, round) => sum + round.matches.length, 0), 3);
});

test("classic schedule survives integration of late arrivals without rematches", () => {
  const config = classicConfig({ players: playersOf(8), courts: 2, targetGamesPerPlayer: 6 });
  const generated = generateTournament(config);
  generated.rounds[0].isLocked = true;
  generated.rounds[1].isLocked = true;

  const handicap = 1;
  const expanded: Player[] = [
    ...generated.players,
    { id: "late1", name: "Late 1", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "late2", name: "Late 2", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "late3", name: "Late 3", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 },
    { id: "late4", name: "Late 4", gamesPlayed: 0, totalPoints: 0, handicap, integrationWave: 1 }
  ];

  const recalculated = recalculateRemainingTournament(config, expanded, generated.rounds);
  assertNoRematches(recalculated, "Classic after integration");
  assert.ok(recalculated.slice(0, 2).every((round) => round.isLocked), "locked rounds stay locked");
});

test("classic recalculation reports the games it actually scheduled", () => {
  const config = classicConfig({ players: playersOf(8), courts: 2, targetGamesPerPlayer: 6 });
  const generated = generateTournament(config);
  generated.rounds[0].isLocked = true;

  const recalculated = recalculateRemainingTournament(config, generated.players, generated.rounds);
  const report = inspect(recalculated);

  for (const player of generated.players) {
    assert.equal(
      player.gamesPlayed,
      report.gamesPlayed.get(player.id) ?? 0,
      `${player.name} gamesPlayed must match the kept schedule`
    );
  }
});

test("mixed variant keeps gender balance and still avoids rematches", () => {
  const players = [
    ...Array.from({ length: 6 }, (_, i) => ({ name: `M${i + 1}`, gender: "MALE" as const })),
    ...Array.from({ length: 6 }, (_, i) => ({ name: `F${i + 1}`, gender: "FEMALE" as const }))
  ];
  const config = classicConfig({ players, variant: "MIXED", courts: 2, targetGamesPerPlayer: 4 });
  const generated = generateTournament(config);
  assertNoRematches(generated.rounds, "Mixed");

  const genderById = new Map(generated.players.map((player) => [player.id, player.gender]));
  for (const round of generated.rounds) {
    for (const match of round.matches) {
      for (const side of [match.teamA, match.teamB]) {
        const genders = side.map((id) => genderById.get(id));
        assert.ok(
          genders.includes("MALE") && genders.includes("FEMALE"),
          "each mixed team needs one man and one woman"
        );
      }
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";

import type { Round, TournamentConfig } from "@padel/shared";

import {
  generateTournament,
  recalculateRemainingTournament
} from "../../src/engine/americanoScheduler.js";
import { maxGamesDelta } from "../../src/engine/fairnessEvaluator.js";
import { worstStreaks } from "../../src/engine/restStreaks.js";

/**
 * Regression for the "KoS & Otchi Birthday Americano" sheet (16 players, 2 courts, 8 games,
 * first to 16): two players partnered twice and 17 pairs of opponents met twice, although no
 * repeat partner was needed and only 8 repeat opponents are mathematically unavoidable.
 */

interface PairingReport {
  repeatedPartners: string[];
  repeatedOpponents: string[];
  mostMeetings: number;
  /** Distinct pairs of players who meet across the net at least once. */
  opponentPairs: number;
  matches: number;
}

function pairingReport(rounds: Round[]): PairingReport {
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  const bump = (counts: Map<string, number>, a: string, b: string) => {
    const key = [a, b].sort().join(" & ");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  let matches = 0;
  for (const round of rounds) {
    for (const match of round.matches) {
      matches += 1;
      bump(partners, match.teamA[0], match.teamA[1]);
      bump(partners, match.teamB[0], match.teamB[1]);
      for (const a of match.teamA) {
        for (const b of match.teamB) {
          bump(opponents, a, b);
        }
      }
    }
  }

  const repeated = (counts: Map<string, number>) =>
    [...counts].filter(([, count]) => count > 1).map(([key]) => key);
  return {
    repeatedPartners: repeated(partners),
    repeatedOpponents: repeated(opponents),
    mostMeetings: Math.max(0, ...opponents.values()),
    opponentPairs: opponents.size,
    matches
  };
}

function roundRobinConfig(playerCount: number, courts: number): TournamentConfig {
  return { ...classicConfig(playerCount, courts, 4), schedulingMode: "ROUND_ROBIN", targetGamesPerPlayer: undefined };
}

function classicConfig(playerCount: number, courts: number, targetGamesPerPlayer: number): TournamentConfig {
  return {
    name: "Repeat pairings",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: playerCount }, (_, index) => ({ name: `P${index + 1}` })),
    courts,
    pointsPerMatch: 16,
    targetGamesPerPlayer
  };
}

/** Schedule expressed as player positions, so runs with different generated ids can be compared. */
function shapeOf(generated: ReturnType<typeof generateTournament>): number[][] {
  const position = new Map(generated.players.map((player, index) => [player.id, index]));
  return generated.rounds.flatMap((round) =>
    round.matches.map((match) => [...match.teamA, ...match.teamB].map((id) => position.get(id) ?? -1))
  );
}

test("16 players, 2 courts, 8 games: nobody partners the same person twice", () => {
  const { players, rounds } = generateTournament(classicConfig(16, 2, 8));
  const report = pairingReport(rounds);

  assert.deepEqual(report.repeatedPartners, [], "every partnership must be unique");
  assert.equal(rounds.length, 16);
  for (const player of players) {
    assert.equal(player.gamesPlayed, 8, `${player.name} must play exactly 8 games`);
  }
});

test("16 players, 2 courts, 8 games: only the 8 unavoidable repeat opponents remain", () => {
  const { players, rounds } = generateTournament(classicConfig(16, 2, 8));
  const report = pairingReport(rounds);

  // 16 opponent slots each but only 15 other players => exactly 8 repeated pairs is the
  // mathematical minimum. The old scheduler produced 17.
  assert.equal(report.mostMeetings, 2, "no two players may face each other three times");
  assert.equal(report.repeatedOpponents.length, 8, "repeat opponents must hit the minimum");
  assert.equal(report.opponentPairs, 120, "everyone must face everyone else at least once");

  const streaks = worstStreaks(rounds, players.map((player) => player.id));
  assert.ok(streaks.rest <= 2, "nobody sits out more than two rounds in a row");
});

test("scheduling is deterministic for the same configuration", () => {
  const first = shapeOf(generateTournament(classicConfig(16, 2, 8)));
  const second = shapeOf(generateTournament(classicConfig(16, 2, 8)));
  assert.deepEqual(first, second);
});

for (const playerCount of [8, 10, 12, 13, 16, 20, 24]) {
  for (const courts of [1, 2, 3, 4]) {
    for (const target of [4, 6, 8]) {
      if (target > playerCount - 1) {
        continue;
      }
      test(`classic ${playerCount} players, ${courts} courts, ${target} games has no repeat partners`, () => {
        const { rounds } = generateTournament(classicConfig(playerCount, courts, target));
        const report = pairingReport(rounds);
        const partnershipsAvailable = (playerCount * (playerCount - 1)) / 2;
        assert.ok(report.matches * 2 <= partnershipsAvailable, "config must leave room for unique partners");
        assert.deepEqual(report.repeatedPartners, []);
        assert.ok(report.mostMeetings <= 3, "opponents must be spread around");
      });
    }
  }
}

test("recalculating after locked rounds keeps them intact and avoids repeat partners", () => {
  const config = classicConfig(16, 2, 8);
  const generated = generateTournament(config);
  for (const round of generated.rounds.slice(0, 5)) {
    round.isLocked = true;
  }
  const lockedBefore = JSON.stringify(generated.rounds.slice(0, 5));

  const recalculated = recalculateRemainingTournament(config, generated.players, generated.rounds);
  const report = pairingReport(recalculated);

  assert.equal(JSON.stringify(recalculated.slice(0, 5)), lockedBefore, "locked rounds must not change");
  assert.deepEqual(report.repeatedPartners, []);
  assert.ok(report.mostMeetings <= 2);
  assert.ok(maxGamesDelta(generated.players) <= 1, "games must stay balanced");
  for (const player of generated.players) {
    assert.equal(player.gamesPlayed, 8);
  }
});

test("round robin for 16 players on 2 courts is 16 rounds with everyone facing everyone", () => {
  const { players, rounds } = generateTournament(roundRobinConfig(16, 2));
  const report = pairingReport(rounds);

  assert.equal(rounds.length, 16);
  assert.deepEqual(report.repeatedPartners, []);
  assert.equal(report.opponentPairs, 120, "all 120 pairs of players must face each other");
  assert.equal(report.repeatedOpponents.length, 8);
  for (const player of players) {
    assert.equal(player.gamesPlayed, 8);
  }
});

test("round robin for 17 players on 2 courts has every pair face each other exactly once", () => {
  const { players, rounds } = generateTournament(roundRobinConfig(17, 2));
  const report = pairingReport(rounds);

  assert.deepEqual(report.repeatedPartners, []);
  assert.deepEqual(report.repeatedOpponents, []);
  assert.equal(report.opponentPairs, (17 * 16) / 2);
  assert.ok(maxGamesDelta(players) === 0);
});

for (const [playerCount, courts] of [[8, 1], [8, 2], [12, 2], [12, 3], [16, 3], [16, 4], [20, 5], [24, 3]]) {
  test(`round robin for ${playerCount} players on ${courts} courts keeps games equal with no repeat partners`, () => {
    const { players, rounds } = generateTournament(roundRobinConfig(playerCount, courts));
    const report = pairingReport(rounds);
    const expectedGames = Math.ceil((playerCount - 1) / 2);

    assert.deepEqual(report.repeatedPartners, []);
    assert.ok(report.mostMeetings <= 2, "nobody faces the same opponent three times");
    for (const player of players) {
      assert.equal(player.gamesPlayed, expectedGames);
    }
  });
}

test("every round of a cyclic schedule seats each player at most once", () => {
  for (const [playerCount, courts, target] of [[16, 2, 8], [17, 2, 8], [20, 2, 8], [24, 3, 12], [16, 1, 4], [32, 4, 8]]) {
    const { rounds } = generateTournament(classicConfig(playerCount, courts, target));
    for (const round of rounds) {
      const seated = round.matches.flatMap((match) => [...match.teamA, ...match.teamB]);
      assert.equal(new Set(seated).size, seated.length, `round ${round.roundNumber} double-books a player`);
      assert.equal(round.matches.length, courts);
    }
  }
});

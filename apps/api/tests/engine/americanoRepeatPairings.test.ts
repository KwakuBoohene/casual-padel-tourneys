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
    matches
  };
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

test("16 players, 2 courts, 8 games: repeat opponents stay close to the unavoidable minimum", () => {
  const { players, rounds } = generateTournament(classicConfig(16, 2, 8));
  const report = pairingReport(rounds);

  // 16 opponent slots each but only 15 other players => at least 8 repeated pairs. The old
  // scheduler produced 17.
  assert.ok(report.mostMeetings <= 2, "no two players may face each other three times");
  assert.ok(
    report.repeatedOpponents.length <= 14,
    `expected at most 14 repeated opponent pairs, got ${report.repeatedOpponents.length}`
  );

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

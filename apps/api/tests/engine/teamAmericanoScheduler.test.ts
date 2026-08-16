import assert from "node:assert/strict";
import test from "node:test";

import type { TournamentConfig } from "@padel/shared";

import { generateTournament } from "../../src/engine/americanoScheduler.js";
import { createTournament, submitScore } from "../../src/lib/store.js";

function teamAmericanoConfig(overrides?: Partial<TournamentConfig>): TournamentConfig {
  const teams = [
    { playerA: { name: "A1" }, playerB: { name: "A2" }, name: "Alpha" },
    { playerA: { name: "B1" }, playerB: { name: "B2" }, name: "Bravo" },
    { playerA: { name: "C1" }, playerB: { name: "C2" } },
    { playerA: { name: "D1" }, playerB: { name: "D2" } }
  ];
  return {
    name: "Team Americano Night",
    mode: "AMERICANO",
    variant: "TEAM",
    schedulingMode: "TARGET_GAMES",
    players: teams.flatMap((team) => [team.playerA, team.playerB]),
    teams,
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 3,
    ...overrides
  };
}

function assertMatchUsesFixedPairs(
  match: { teamA: string[]; teamB: string[] },
  fixedPairs: NonNullable<ReturnType<typeof generateTournament>["fixedPairs"]>
): void {
  const pairA = fixedPairs.find(
    (pair) =>
      (pair.playerAId === match.teamA[0] && pair.playerBId === match.teamA[1]) ||
      (pair.playerAId === match.teamA[1] && pair.playerBId === match.teamA[0])
  );
  const pairB = fixedPairs.find(
    (pair) =>
      (pair.playerAId === match.teamB[0] && pair.playerBId === match.teamB[1]) ||
      (pair.playerAId === match.teamB[1] && pair.playerBId === match.teamB[0])
  );
  assert.ok(pairA, "teamA must be a fixed pair");
  assert.ok(pairB, "teamB must be a fixed pair");
  assert.notEqual(pairA.id, pairB.id);
}

test("Team Americano keeps fixed pairs across all generated rounds", () => {
  const { players, rounds, fixedPairs } = generateTournament(teamAmericanoConfig());
  assert.equal(players.length, 8);
  assert.ok(fixedPairs);
  assert.equal(fixedPairs!.length, 4);
  assert.ok(players.every((player) => Boolean(player.pairId)));
  assert.ok(rounds.length > 0);

  for (const round of rounds) {
    for (const match of round.matches) {
      assertMatchUsesFixedPairs(match, fixedPairs!);
    }
  }
});

test("Team Americano with odd pairs leaves a pair sitting out", () => {
  const teams = [
    { playerA: { name: "A1" }, playerB: { name: "A2" } },
    { playerA: { name: "B1" }, playerB: { name: "B2" } },
    { playerA: { name: "C1" }, playerB: { name: "C2" } }
  ];
  const { players, rounds, fixedPairs } = generateTournament(
    teamAmericanoConfig({
      teams,
      players: teams.flatMap((team) => [team.playerA, team.playerB]),
      courts: 1,
      targetGamesPerPlayer: 2
    })
  );
  assert.equal(fixedPairs!.length, 3);
  assert.equal(players.length, 6);
  for (const round of rounds) {
    assert.equal(round.matches.length, 1);
    assertMatchUsesFixedPairs(round.matches[0], fixedPairs!);
  }
});

test("Classic Americano still rotates partners (regression)", () => {
  const { rounds, fixedPairs } = generateTournament({
    name: "Classic",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `P${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    targetGamesPerPlayer: 4
  });
  assert.equal(fixedPairs, undefined);
  assert.ok(rounds.length >= 2);

  const firstMatch = rounds[0].matches[0];
  const partnerKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const round1Partners = new Set(
    rounds[0].matches.flatMap((match) => [
      partnerKey(match.teamA[0], match.teamA[1]),
      partnerKey(match.teamB[0], match.teamB[1])
    ])
  );
  // At least one later round should use a different pairing somewhere (not all identical).
  let sawChange = false;
  for (const round of rounds.slice(1)) {
    for (const match of round.matches) {
      const a = partnerKey(match.teamA[0], match.teamA[1]);
      const b = partnerKey(match.teamB[0], match.teamB[1]);
      if (!round1Partners.has(a) || !round1Partners.has(b)) {
        sawChange = true;
      }
    }
  }
  assert.ok(firstMatch.teamA.length === 2);
  assert.ok(sawChange || rounds.length === 1);
});

test("store create Team Americano scores a completed match", () => {
  const tournament = createTournament(teamAmericanoConfig(), "org_team_am");
  assert.equal(tournament.fixedPairs?.length, 4);
  assert.equal(tournament.config.variant, "TEAM");
  assert.equal(tournament.config.mode, "AMERICANO");

  const match = tournament.rounds[0].matches[0];
  const scored = submitScore(tournament.id, match.id, 16, 8);
  assert.equal(scored.rounds[0].matches[0].completed, true);
  const sideA = match.teamA.map((id) => scored.players.find((player) => player.id === id)!);
  assert.ok(sideA.every((player) => player.totalPoints === 16));
});

import assert from "node:assert/strict";
import test from "node:test";

import type { Player, TournamentConfig } from "@padel/shared";

import {
  buildNextMexicanoRound,
  generateMexicano
} from "../../src/engine/mexicanoScheduler.js";

function baseConfig(overrides: Partial<TournamentConfig> = {}): TournamentConfig {
  return {
    name: "Mexicano",
    mode: "MEXICANO",
    variant: "CLASSIC",
    schedulingMode: "TOTAL_TIME",
    players: Array.from({ length: 8 }, (_, i) => ({ name: `Player ${i + 1}` })),
    courts: 2,
    pointsPerMatch: 24,
    tournamentTimeMinutes: 90,
    ...overrides
  };
}

/** Deterministic sequence so lottery tests are stable. */
function seqRandom(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}

test("generateMexicano creates only round 1", () => {
  const { players, rounds } = generateMexicano(baseConfig());
  assert.equal(players.length, 8);
  assert.equal(rounds.length, 1);
  assert.equal(rounds[0].roundNumber, 1);
  assert.equal(rounds[0].isLocked, false);
  assert.equal(rounds[0].matches.length, 2);
  for (const match of rounds[0].matches) {
    assert.equal(match.teamA.length, 2);
    assert.equal(match.teamB.length, 2);
    assert.equal(match.completed, false);
  }
});

test("generateMexicano sit-outs when not divisible by four", () => {
  const { rounds } = generateMexicano(
    baseConfig({
      players: Array.from({ length: 10 }, (_, i) => ({ name: `P${i + 1}` })),
      courts: 2
    })
  );
  assert.equal(rounds[0].matches.length, 2);
  const playing = new Set(
    rounds[0].matches.flatMap((match) => [...match.teamA, ...match.teamB])
  );
  assert.equal(playing.size, 8);
});

test("generateMexicano courts truncate capacity", () => {
  const { rounds } = generateMexicano(
    baseConfig({
      players: Array.from({ length: 12 }, (_, i) => ({ name: `P${i + 1}` })),
      courts: 2
    })
  );
  assert.equal(rounds[0].matches.length, 2);
});

test("generateMexicano players start at zero points", () => {
  const { players } = generateMexicano(baseConfig({ players: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }], courts: 1 }));
  for (const player of players) {
    assert.ok(player.id.startsWith("player_"));
    assert.equal(player.totalPoints, 0);
    assert.equal(player.gamesPlayed, 0);
  }
});

test("buildNextMexicanoRound uses 1+3 vs 2+4 ladder", () => {
  const players: Player[] = [
    { id: "p1", name: "1", gamesPlayed: 1, totalPoints: 40 },
    { id: "p2", name: "2", gamesPlayed: 1, totalPoints: 30 },
    { id: "p3", name: "3", gamesPlayed: 1, totalPoints: 20 },
    { id: "p4", name: "4", gamesPlayed: 1, totalPoints: 10 },
    { id: "p5", name: "5", gamesPlayed: 1, totalPoints: 8 },
    { id: "p6", name: "6", gamesPlayed: 1, totalPoints: 6 },
    { id: "p7", name: "7", gamesPlayed: 1, totalPoints: 4 },
    { id: "p8", name: "8", gamesPlayed: 1, totalPoints: 2 }
  ];
  const round = buildNextMexicanoRound({
    players,
    courts: 2,
    variant: "CLASSIC",
    roundNumber: 2
  });
  assert.equal(round.roundNumber, 2);
  assert.equal(round.matches.length, 2);
  assert.deepEqual(round.matches[0].teamA, ["p1", "p3"]);
  assert.deepEqual(round.matches[0].teamB, ["p2", "p4"]);
  assert.deepEqual(round.matches[1].teamA, ["p5", "p7"]);
  assert.deepEqual(round.matches[1].teamB, ["p6", "p8"]);
});

test("buildNextMexicanoRound MIXED prefers M+F sides", () => {
  const players: Player[] = [
    { id: "m1", name: "M1", gender: "MALE", gamesPlayed: 1, totalPoints: 40 },
    { id: "m2", name: "M2", gender: "MALE", gamesPlayed: 1, totalPoints: 30 },
    { id: "f1", name: "F1", gender: "FEMALE", gamesPlayed: 1, totalPoints: 20 },
    { id: "f2", name: "F2", gender: "FEMALE", gamesPlayed: 1, totalPoints: 10 }
  ];
  // Classic ladder would be m1+f1 vs m2+f2 — already mixed.
  // Force a same-gender ladder cut with order m1,m2,f1,f2 → default 1+3=m1+f1, 2+4=m2+f2.
  const round = buildNextMexicanoRound({
    players,
    courts: 1,
    variant: "MIXED",
    roundNumber: 2
  });
  const match = round.matches[0];
  const genders = (ids: [string, string]) =>
    ids.map((id) => players.find((p) => p.id === id)?.gender).sort().join("+");
  assert.equal(genders(match.teamA), "FEMALE+MALE");
  assert.equal(genders(match.teamB), "FEMALE+MALE");
});

test("generateMexicano MIXED lottery forms mixed sides when possible", () => {
  const config = baseConfig({
    variant: "MIXED",
    players: [
      { name: "M1", gender: "MALE" },
      { name: "M2", gender: "MALE" },
      { name: "M3", gender: "MALE" },
      { name: "M4", gender: "MALE" },
      { name: "F1", gender: "FEMALE" },
      { name: "F2", gender: "FEMALE" },
      { name: "F3", gender: "FEMALE" },
      { name: "F4", gender: "FEMALE" }
    ]
  });
  // Keep original order (no swaps) so groups are MMMM then need remap — use identity shuffle.
  const { players, rounds } = generateMexicano(config, {
    random: seqRandom([0, 0, 0, 0, 0, 0, 0, 0])
  });
  assert.equal(players.filter((p) => p.gender === "MALE").length, 4);
  assert.equal(players.filter((p) => p.gender === "FEMALE").length, 4);
  for (const match of rounds[0].matches) {
    const teamGender = (ids: [string, string]) => {
      const g = ids.map((id) => players.find((p) => p.id === id)?.gender);
      return new Set(g).size === 2;
    };
    // Best-effort: when a group of 4 has 2M+2F, sides should be mixed.
    const group = [...match.teamA, ...match.teamB]
      .map((id) => players.find((p) => p.id === id)?.gender)
      .filter(Boolean);
    const males = group.filter((g) => g === "MALE").length;
    if (males === 2) {
      assert.equal(teamGender(match.teamA), true);
      assert.equal(teamGender(match.teamB), true);
    }
  }
});

test("Team Mexicano keeps fixed pairs and ladders 1 vs 2", () => {
  const teams = [
    { playerA: { name: "A1" }, playerB: { name: "A2" } },
    { playerA: { name: "B1" }, playerB: { name: "B2" } },
    { playerA: { name: "C1" }, playerB: { name: "C2" } },
    { playerA: { name: "D1" }, playerB: { name: "D2" } }
  ];
  const { players, rounds, fixedPairs } = generateMexicano(
    baseConfig({
      variant: "TEAM",
      players: teams.flatMap((team) => [team.playerA, team.playerB]),
      teams,
      courts: 2
    }),
    { random: seqRandom([0, 0, 0, 0]) }
  );
  assert.ok(fixedPairs);
  assert.equal(fixedPairs!.length, 4);
  assert.equal(players.every((player) => Boolean(player.pairId)), true);
  assert.equal(rounds[0].matches.length, 2);

  // Force standings: pairs ordered A > B > C > D by points on playerA of each pair.
  const byName = new Map(players.map((player) => [player.name, player]));
  const setPairPoints = (a: string, b: string, points: number) => {
    byName.get(a)!.totalPoints = points;
    byName.get(b)!.totalPoints = points;
    byName.get(a)!.gamesPlayed = 1;
    byName.get(b)!.gamesPlayed = 1;
  };
  setPairPoints("A1", "A2", 40);
  setPairPoints("B1", "B2", 30);
  setPairPoints("C1", "C2", 20);
  setPairPoints("D1", "D2", 10);

  const next = buildNextMexicanoRound({
    players,
    courts: 2,
    variant: "TEAM",
    roundNumber: 2,
    fixedPairs
  });
  assert.equal(next.matches.length, 2);
  const pairOf = (name: string) => byName.get(name)!.pairId!;
  const m0 = next.matches[0];
  assert.deepEqual(new Set(m0.teamA), new Set([byName.get("A1")!.id, byName.get("A2")!.id]));
  assert.deepEqual(new Set(m0.teamB), new Set([byName.get("B1")!.id, byName.get("B2")!.id]));
  assert.equal(pairOf("A1"), pairOf("A2"));
  assert.notEqual(pairOf("A1"), pairOf("B1"));
  const m1 = next.matches[1];
  assert.deepEqual(new Set(m1.teamA), new Set([byName.get("C1")!.id, byName.get("C2")!.id]));
  assert.deepEqual(new Set(m1.teamB), new Set([byName.get("D1")!.id, byName.get("D2")!.id]));
});

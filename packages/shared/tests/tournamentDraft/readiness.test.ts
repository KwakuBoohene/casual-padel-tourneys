import assert from "node:assert/strict";
import test from "node:test";

import { getDraftReadiness, tournamentDraftPayloadSchema } from "../../src/index.ts";
import { FULL_AMERICANO, FULL_KOH, FULL_MEXICANO_REGULAR, FULL_TEAM_AMERICANO } from "./fixtures.ts";

const readiness = (body: unknown) => getDraftReadiness(tournamentDraftPayloadSchema.parse(body));
const item = (body: unknown, key: string) => readiness(body).items.find((entry) => entry.key === key);

test("full fixtures are ready", () => {
  for (const body of [FULL_AMERICANO, FULL_MEXICANO_REGULAR, FULL_TEAM_AMERICANO, FULL_KOH]) {
    const result = readiness(body);
    assert.equal(result.ready, true, JSON.stringify(result));
    assert.equal(result.blockingReason, undefined);
  }
});

test("empty draft lists everything missing and is not ready", () => {
  const result = readiness({ mode: "AMERICANO" });
  assert.equal(result.ready, false);
  assert.deepEqual(
    result.items.map((entry) => entry.status),
    ["missing", "missing", "missing", "missing", "missing"]
  );
  assert.equal(result.blockingReason, "Add a tournament name");
});

test("missing players gives a count-based reason", () => {
  const result = readiness({ ...FULL_AMERICANO, players: FULL_AMERICANO.players.slice(0, 2) });
  assert.equal(result.ready, false);
  assert.equal(result.blockingReason, "Add 2 more players to start");
});

test("Mexicano needs 8 players", () => {
  assert.equal(item({ ...FULL_MEXICANO_REGULAR, players: FULL_MEXICANO_REGULAR.players.slice(0, 7) }, "players")?.label, "Add 1 more player to start");
});

test("blank player rows do not count", () => {
  const players = [...FULL_AMERICANO.players.slice(0, 3), { name: "  " }];
  assert.equal(item({ ...FULL_AMERICANO, players }, "players")?.label, "Add 1 more player to start");
});

test("MIXED requires gender for every player", () => {
  const result = readiness({ ...FULL_AMERICANO, variant: "MIXED" });
  assert.equal(result.ready, false);
  assert.equal(result.blockingReason, "Set gender for 12 players");
});

test("TEAM counts complete teams", () => {
  const result = readiness({ ...FULL_TEAM_AMERICANO, teams: FULL_TEAM_AMERICANO.teams.slice(0, 1) });
  assert.equal(result.blockingReason, "Add 1 more team to start");
  const half = readiness({ ...FULL_TEAM_AMERICANO, teams: [...FULL_TEAM_AMERICANO.teams, { playerA: { name: "C1" }, playerB: { name: "" } }] });
  assert.equal(half.blockingReason, "Finish every team (two players each)");
});

test("scoring requirements follow scheduling and scoring mode", () => {
  assert.equal(item({ ...FULL_AMERICANO, targetGamesPerPlayer: undefined }, "scoring")?.label, "Set games per player");
  assert.equal(item({ ...FULL_AMERICANO, pointsPerMatch: undefined }, "scoring")?.label, "Set points per match");
  assert.equal(item({ ...FULL_AMERICANO, scoringMode: "REGULAR" }, "scoring")?.label, "Choose a set format");
  assert.equal(item(FULL_AMERICANO, "scoring")?.label, "To 24 points · 4 games each");
});

test("KOH needs two complete pairs per court with unique players", () => {
  const oneCourtShort = {
    ...FULL_KOH,
    courtAssignments: [FULL_KOH.courtAssignments[0], { courtNumber: 2, units: [FULL_KOH.courtAssignments[1].units[0]] }]
  };
  assert.equal(readiness(oneCourtShort).blockingReason, "Court 2 needs at least 2 pairs");
  const duplicate = {
    ...FULL_KOH,
    courtAssignments: [FULL_KOH.courtAssignments[0], { courtNumber: 2, units: [FULL_KOH.courtAssignments[0].units[0], FULL_KOH.courtAssignments[1].units[1]] }]
  };
  assert.equal(readiness(duplicate).blockingReason, "Each player can only appear once");
});

test("full schema issues block start even when items look ok", () => {
  const result = readiness({ ...FULL_KOH, promotionRules: [] });
  assert.equal(result.ready, false);
  assert.equal(result.items.every((entry) => entry.status === "ok"), true);
  assert.equal(result.blockingReason, "Provide promotionRules when courts ≥ 2.");
});

test("a court needs four players, as in the create wizard", () => {
  const result = readiness({ ...FULL_AMERICANO, courts: 3, players: FULL_AMERICANO.players.slice(0, 4) });
  assert.equal(result.ready, false);
  assert.equal(
    item({ ...FULL_AMERICANO, courts: 3, players: FULL_AMERICANO.players.slice(0, 4) }, "courts")?.status,
    "missing"
  );
  assert.equal(result.blockingReason, "3 courts need at least 12 players");
  assert.equal(
    readiness({ ...FULL_AMERICANO, courts: 1, players: FULL_AMERICANO.players.slice(0, 4) }).ready,
    true
  );
});

test("duplicate player names block the start, ignoring case", () => {
  const players = [{ name: "Alex" }, { name: "alex " }, { name: "Ben" }, { name: "Cleo" }];
  const result = readiness({ ...FULL_AMERICANO, courts: 1, players });
  assert.equal(result.ready, false);
  assert.equal(result.blockingReason, "No two players can have the same name");
});

test("the inactive roster is kept in the draft but never started or counted", () => {
  const both = { ...FULL_TEAM_AMERICANO, players: [{ name: "Solo" }, { name: "Solo" }] };
  assert.equal(readiness(both).ready, true, JSON.stringify(readiness(both)));
  const classic = { ...FULL_AMERICANO, teams: [{ playerA: { name: "Half" }, playerB: { name: "" } }] };
  assert.equal(readiness(classic).ready, true, JSON.stringify(readiness(classic)));
});

test("the blocking reason follows wizard order: players before match settings", () => {
  const result = readiness({
    mode: "AMERICANO",
    name: "Name only",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES"
  });
  assert.equal(result.blockingReason, "Add 4 more players to start");
});

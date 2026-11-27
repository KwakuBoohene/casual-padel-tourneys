import assert from "node:assert/strict";
import test from "node:test";

import {
  DRAFT_LIMITS,
  americanoMexicanoDraftPayloadSchema,
  createKohTournamentSchema,
  createTournamentSchema,
  draftToCreateBodies,
  kohDraftPayloadSchema,
  tournamentDraftPayloadSchema,
  utf8ByteLength
} from "../../src/index.ts";
import { FULL_AMERICANO, FULL_KOH, FULL_MEXICANO_REGULAR, FULL_TEAM_AMERICANO } from "./fixtures.ts";

test("every full create body is also a valid draft payload", () => {
  for (const body of [FULL_AMERICANO, FULL_MEXICANO_REGULAR, FULL_TEAM_AMERICANO, FULL_KOH]) {
    const result = tournamentDraftPayloadSchema.safeParse(body);
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
  }
});

test("a draft only needs a mode", () => {
  assert.equal(tournamentDraftPayloadSchema.safeParse({ mode: "AMERICANO" }).success, true);
  assert.equal(tournamentDraftPayloadSchema.safeParse({ mode: "KING_OF_THE_HILL" }).success, true);
  assert.equal(tournamentDraftPayloadSchema.safeParse({ name: "x" }).success, false);
});

test("legacy KOH mode normalizes to King of the Court", () => {
  const parsed = tournamentDraftPayloadSchema.parse({ mode: "KING_OF_THE_HILL" });
  assert.equal(parsed.mode, "KING_OF_THE_COURT");
});

test("blank player names are allowed while drafting", () => {
  const parsed = tournamentDraftPayloadSchema.parse({ mode: "AMERICANO", players: [{ name: "" }] });
  assert.equal(parsed.mode, "AMERICANO");
});

test("caps reject oversized drafts", () => {
  const tooMany = Array.from({ length: DRAFT_LIMITS.playersMax + 1 }, (_, i) => ({ name: `P${i}` }));
  assert.equal(tournamentDraftPayloadSchema.safeParse({ mode: "AMERICANO", players: tooMany }).success, false);
  const longName = "x".repeat(DRAFT_LIMITS.nameMax + 1);
  assert.equal(tournamentDraftPayloadSchema.safeParse({ mode: "AMERICANO", name: longName }).success, false);
});

test("utf8ByteLength counts multi-byte characters", () => {
  assert.equal(utf8ByteLength("abc"), 3);
  assert.equal(utf8ByteLength("é"), 2);
  assert.equal(utf8ByteLength("🎾"), 4);
});

test("draft schemas cover every create field (drift guard)", () => {
  const draftKeys = new Set(Object.keys(americanoMexicanoDraftPayloadSchema.shape));
  for (const key of Object.keys(createTournamentSchema.shape)) {
    assert.ok(draftKeys.has(key), `Americano/Mexicano draft is missing create field "${key}"`);
  }
  const kohKeys = new Set(Object.keys(kohDraftPayloadSchema.shape));
  for (const key of Object.keys(createKohTournamentSchema.shape)) {
    assert.ok(kohKeys.has(key), `KOH draft is missing create field "${key}"`);
  }
});

test("draftToCreateBodies trims names and drops blank players", () => {
  const bodies = draftToCreateBodies(
    tournamentDraftPayloadSchema.parse({
      mode: "AMERICANO",
      name: "  Friday  ",
      players: [{ name: " Alex " }, { name: "   " }, { name: "Sam" }]
    })
  );
  assert.equal(bodies.kind, "AMERICANO_MEXICANO");
  assert.equal(bodies.create.name, "Friday");
  assert.deepEqual(bodies.create.players, [{ name: "Alex" }, { name: "Sam" }]);
  assert.equal("pointsPerMatch" in bodies.create, false);
});

test("full draft bodies equal what the create schemas accept", () => {
  const am = draftToCreateBodies(tournamentDraftPayloadSchema.parse(FULL_AMERICANO));
  assert.equal(am.kind, "AMERICANO_MEXICANO");
  assert.deepEqual(createTournamentSchema.parse(am.create), createTournamentSchema.parse(FULL_AMERICANO));

  const koh = draftToCreateBodies(tournamentDraftPayloadSchema.parse(FULL_KOH));
  assert.equal(koh.kind, "KING_OF_THE_COURT");
  if (koh.kind !== "KING_OF_THE_COURT") return;
  assert.equal(createKohTournamentSchema.safeParse(koh.create).success, true);
  assert.equal(koh.assign.courts.length, 2);
  assert.equal(koh.assign.courts[0].units.length, 2);
});

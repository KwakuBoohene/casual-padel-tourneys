import assert from "node:assert/strict";
import test from "node:test";

import { getDraftReadiness, tournamentDraftPayloadSchema } from "@padel/shared";

import {
  fromDraftPayload,
  hasDraftContent,
  resumeStepFor,
  toDraftPayload,
  type DraftWizardSnapshot
} from "../../../src/utilities/organizer/draftPayload.ts";
import { buildTournamentListRows } from "../../../src/utilities/organizer/tournamentListRows.ts";
import { draftFooterLabel, draftMetaLabel, relativeTime } from "../../../src/utilities/organizer/draftListLabels.ts";

const base: DraftWizardSnapshot = {
  name: "Friday Social",
  mode: "AMERICANO",
  variant: "CLASSIC",
  schedulingMode: "TARGET_GAMES",
  players: ["A", "B", "", "D"],
  playerGenders: [undefined, undefined, undefined, undefined],
  teams: [],
  courtsText: "1",
  pointsText: "24",
  targetGamesText: "4",
  tournamentTimeText: "90",
  scoringMode: "AMERICANO_POINTS",
  regularScoring: { setFormat: "FULL_SET", gameWinBy: 2, deuceMode: "ADVANTAGE", setsToWin: 1, setTiebreakTo: 7 },
  contributeToCareerLeaderboard: true
};

test("toDraftPayload produces a valid draft and drops scoring that doesn't apply", () => {
  const payload = toDraftPayload(base);
  assert.equal(tournamentDraftPayloadSchema.safeParse(payload).success, true);
  assert.equal(payload.pointsPerMatch, 24);
  assert.equal(payload.targetGamesPerPlayer, 4);
  assert.equal("regularScoring" in payload, false);
  assert.equal("tournamentTimeMinutes" in payload, false);
});

test("invalid number fields are left out instead of saved as NaN", () => {
  const payload = toDraftPayload({ ...base, courtsText: "", pointsText: "abc" });
  assert.equal("courts" in payload, false);
  assert.equal("pointsPerMatch" in payload, false);
});

test("a saved draft round-trips back to the same payload", () => {
  for (const snapshot of [
    base,
    { ...base, scoringMode: "REGULAR" as const },
    { ...base, variant: "TEAM" as const, players: [], playerGenders: [], teams: [{ playerA: "A", playerB: "B" }] },
    { ...base, mode: "MEXICANO" as const, schedulingMode: "TOTAL_TIME" as const }
  ]) {
    const payload = toDraftPayload(snapshot);
    const parsed = tournamentDraftPayloadSchema.parse(payload);
    if (parsed.mode !== "AMERICANO" && parsed.mode !== "MEXICANO") throw new Error("unexpected mode");
    assert.deepEqual(toDraftPayload(fromDraftPayload(parsed)), payload);
  }
});

test("resume step follows the first missing readiness item", () => {
  const readiness = (snapshot: DraftWizardSnapshot) =>
    getDraftReadiness(tournamentDraftPayloadSchema.parse(toDraftPayload(snapshot)));
  assert.equal(resumeStepFor(readiness({ ...base, name: "" })), "NAME");
  assert.equal(resumeStepFor(readiness(base)), "PLAYERS");
  assert.equal(resumeStepFor(readiness({ ...base, players: ["A", "B", "C", "D"] })), "SETTINGS");
});

test("hasDraftContent ignores untouched wizards", () => {
  assert.equal(hasDraftContent({ name: " ", players: ["", " "], teams: [] }), false);
  assert.equal(hasDraftContent({ name: "", players: ["Alex"], teams: [] }), true);
});

const summary = {
  id: "d1",
  name: "Friday",
  mode: "AMERICANO" as const,
  playerCount: 10,
  courts: 3,
  role: "OWNER" as const,
  version: 2,
  updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  updatedBy: { id: "u2", name: "Sam" },
  collaborators: [],
  readiness: { ready: false, blockingReason: "Add 2 more players to start" }
};

test("draft list labels", () => {
  assert.equal(draftMetaLabel(summary), "Americano · 10 players · 3 courts");
  assert.equal(draftFooterLabel(summary), "Edited 2h ago by Sam");
  assert.equal(relativeTime(new Date().toISOString()), "just now");
  const shared = { ...summary, role: "EDITOR" as const, collaborators: [{ userId: "o", name: "Ama", initials: "AM" }] };
  assert.equal(draftFooterLabel(shared), "Owner Ama · edited 2h ago");
});

test("list rows put drafts and shared drafts above tournaments", () => {
  const rows = buildTournamentListRows({
    tournaments: [],
    ownDrafts: [summary],
    sharedDrafts: [{ ...summary, id: "d2", role: "EDITOR" as const }]
  });
  assert.deepEqual(
    rows.map((row) => (row.type === "label" ? row.label : row.type)),
    ["DRAFTS · 1", "draft", "SHARED WITH YOU", "draft"]
  );
  assert.equal(buildTournamentListRows({ tournaments: [], ownDrafts: [], sharedDrafts: [] }).length, 0);
});

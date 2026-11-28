import assert from "node:assert/strict";
import test from "node:test";

import { getDraftReadiness, type AmericanoMexicanoDraftPayload } from "@padel/shared";

import { ApiError } from "../../../src/api/errors.ts";
import { diffDraftPayload } from "../../../src/utilities/organizer/draftDiff.ts";
import { draftOverviewSections } from "../../../src/utilities/organizer/draftOverviewSections.ts";
import {
  draftLoadFailure,
  draftStartFailure,
  draftStartSummary,
  keepAccessLine
} from "../../../src/utilities/organizer/draftStart.ts";

const players = (...names: string[]) => names.map((name) => ({ name }));
const base: AmericanoMexicanoDraftPayload = {
  name: "Friday Social",
  mode: "AMERICANO",
  variant: "CLASSIC",
  schedulingMode: "TARGET_GAMES",
  players: players("Ama", "Ben", "Cy", "Dee"),
  courts: 1,
  scoringMode: "AMERICANO_POINTS",
  pointsPerMatch: 24,
  targetGamesPerPlayer: 4,
  contributeToCareerLeaderboard: true
};

test("disjoint edits: both survive the re-apply", () => {
  const latest = { ...base, courts: 2 };
  const local = { ...base, name: "Friday Night" };
  const diff = diffDraftPayload(base, latest, local);
  assert.deepEqual(diff.theirs.map((change) => change.label), ["Courts → 2"]);
  assert.deepEqual(diff.mine.map((change) => change.label), ['Renamed to "Friday Night"']);
  assert.equal(diff.mine[0].overwritesTheirs, undefined);
  assert.equal(diff.merged.courts, 2);
  assert.equal(diff.merged.name, "Friday Night");
});

test("same field changed by both: mine wins and is flagged", () => {
  const diff = diffDraftPayload(base, { ...base, pointsPerMatch: 21 }, { ...base, pointsPerMatch: 32 });
  assert.equal(diff.merged.pointsPerMatch, 32);
  assert.equal(diff.mine[0].overwritesTheirs, true);
});

test("players added and removed on both sides are merged by name", () => {
  const latest = { ...base, players: players("Ama", "Ben", "Cy", "Dee", "Eve") };
  const local = { ...base, players: players("Ama", "Ben", "Cy", "Fin") };
  const diff = diffDraftPayload(base, latest, local);
  assert.deepEqual(diff.theirs.map((change) => change.label), ["Added Eve"]);
  assert.deepEqual(diff.mine.map((change) => change.label), ["Added Fin · removed Dee"]);
  assert.deepEqual(diff.merged.players?.map((player) => player.name), ["Ama", "Ben", "Cy", "Eve", "Fin"]);
});

test("mode change and a field I cleared", () => {
  const latest = { ...base, mode: "MEXICANO" as const };
  const local: AmericanoMexicanoDraftPayload = { ...base };
  delete local.targetGamesPerPlayer;
  const diff = diffDraftPayload(base, latest, local);
  assert.deepEqual(diff.theirs.map((change) => change.label), ["Mode → Mexicano"]);
  assert.equal(diff.merged.mode, "MEXICANO");
  assert.equal("targetGamesPerPlayer" in diff.merged, false);
});

test("start errors map to what the sheet does next", () => {
  const error = (status: number, code?: string) => new ApiError({ message: `m${status}`, status, code });
  assert.deepEqual(draftStartFailure(error(409, "DRAFT_VERSION_CONFLICT")), { kind: "conflict" });
  assert.deepEqual(draftStartFailure(error(400, "DRAFT_NOT_READY")), { kind: "notReady", message: "m400" });
  assert.equal(draftStartFailure(error(404)).kind, "gone");
  assert.equal(draftStartFailure(error(403)).kind, "gone");
  assert.deepEqual(draftStartFailure(error(422, "VALIDATION")), { kind: "failed", message: "m422" });
  assert.equal(draftStartFailure(new TypeError("Network request failed")).kind, "failed");
  assert.equal(draftLoadFailure(error(500)).kind, "failed");
});

test("start summary uses the wizard estimator", () => {
  const summary = draftStartSummary(base);
  assert.equal(summary.players, 4);
  assert.equal(summary.courts, 1);
  assert.ok(summary.estimate && summary.estimate.rounds > 0);
  assert.equal(summary.approximate, false);
  const koh = draftStartSummary({ mode: "KING_OF_THE_COURT", courts: 1, courtAssignments: [] });
  assert.deepEqual(koh, { players: 0, courts: 1, estimate: null, approximate: false });
});

test("keep-access copy", () => {
  assert.equal(keepAccessLine([], true), null);
  assert.equal(keepAccessLine(["Sam"], true), "Sam keeps live control after it starts.");
  assert.equal(keepAccessLine(["Sam", "Ama", "Jo"], false), "Sam, Ama and Jo lose access once it starts.");
});

test("overview sections show the first missing item", () => {
  const sections = draftOverviewSections(getDraftReadiness({ ...base, players: players("Ama") }));
  assert.deepEqual(
    sections.map((section) => [section.title, section.missing, section.step]),
    [
      ["Setup", false, "NAME"],
      ["Players", true, "PLAYERS"],
      ["Match settings", false, "SETTINGS"]
    ]
  );
  assert.match(sections[1].value, /Add 3 more players/);
});

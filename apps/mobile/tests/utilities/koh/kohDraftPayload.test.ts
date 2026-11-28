import assert from "node:assert/strict";
import test from "node:test";

import { draftToCreateBodies, getDraftReadiness, tournamentDraftPayloadSchema } from "@padel/shared";

import { createEmptyDraft, syncCourts } from "../../../src/utilities/koh/createDraft.ts";
import { buildAssignPayload, buildCreatePayload } from "../../../src/utilities/koh/createPayload.ts";
import {
  fromKohDraftPayload,
  hasKohDraftContent,
  kohResumeStep,
  toKohDraftPayload
} from "../../../src/utilities/koh/kohDraftPayload.ts";
import type { KohCreateDraft } from "../../../src/types/koh/create.ts";

const unit = (id: string, a: string, b: string) => ({ id, playerAName: a, playerBName: b });

function readyState(): KohCreateDraft {
  const state = syncCourts({ ...createEmptyDraft(), name: "Sunday KOTC", matchFormat: "FULL_SET", deuceMode: "STAR" }, 2);
  return {
    ...state,
    promoRules: [{ courtNumber: 2, enabled: true, winsRequired: 5 }],
    courtUnits: [
      { courtNumber: 1, units: [unit("1", "A", "B"), unit("2", "C", "D")] },
      { courtNumber: 2, units: [unit("3", "E", "F"), unit("4", "G", "H")] }
    ]
  };
}

test("a KOH draft starts with exactly the bodies the wizard would create", () => {
  const state = readyState();
  const payload = tournamentDraftPayloadSchema.parse(toKohDraftPayload(state));
  assert.equal(getDraftReadiness(payload).ready, true);
  const bodies = draftToCreateBodies(payload);
  if (bodies.kind !== "KING_OF_THE_COURT") throw new Error("expected KOH bodies");
  const create = buildCreatePayload(state);
  assert.deepEqual(bodies.create, JSON.parse(JSON.stringify(create)));
  assert.deepEqual(bodies.assign, buildAssignPayload(state));
});

test("KOH draft round-trips through the wizard state", () => {
  const payload = toKohDraftPayload(readyState());
  const restored = fromKohDraftPayload(payload);
  assert.equal(restored.matchFormat, "FULL_SET");
  assert.equal(restored.deuceMode, "STAR");
  assert.deepEqual(restored.promoRules, [{ courtNumber: 2, enabled: true, winsRequired: 5 }]);
  assert.deepEqual(toKohDraftPayload(restored), payload);
});

test("an unfinished KOH draft resumes at the first missing step", () => {
  const empty = createEmptyDraft();
  assert.equal(hasKohDraftContent(empty), false);
  const named = { ...empty, name: "Sunday" };
  assert.equal(hasKohDraftContent(named), true);
  const readiness = getDraftReadiness(tournamentDraftPayloadSchema.parse(toKohDraftPayload(named)));
  assert.equal(kohResumeStep(readiness), "ASSIGN");
  assert.equal(kohResumeStep(getDraftReadiness(tournamentDraftPayloadSchema.parse(toKohDraftPayload(readyState())))), "REVIEW");
});

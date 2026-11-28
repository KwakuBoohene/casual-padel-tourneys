import test from "node:test";
import assert from "node:assert/strict";

import { importPadelMixTournament } from "../../../../src/modules/tournament/application/importPadelMixTournament.js";
import type {
  PadelMixSource,
  TournamentEvents,
  TournamentRepository
} from "../../../../src/modules/tournament/application/ports.js";
import type { TournamentEvent } from "../../../../src/realtime/events.js";
import { isAppError, notFound } from "../../../../src/shared/kernel/appError.js";
import type { TournamentState } from "../../../../src/types/state.js";

import { padelMixFixture } from "../domain/padelMixFixture.js";

function harness(source: PadelMixSource): {
  deps: { repo: TournamentRepository; events: TournamentEvents; padelMix: PadelMixSource };
  created: TournamentState[];
  published: TournamentEvent[];
} {
  const created: TournamentState[] = [];
  const published: TournamentEvent[] = [];
  const unused = async (): Promise<never> => {
    throw new Error("not used by import");
  };
  const repo: TournamentRepository = {
    getById: unused,
    getByPublicToken: unused,
    listByOrganizer: unused,
    listCollaborating: unused,
    save: unused,
    delete: unused,
    async create(state) {
      created.push(structuredClone(state));
    }
  };
  const events: TournamentEvents = {
    async publish(event) {
      published.push(event);
    }
  };
  return { deps: { repo, events, padelMix: source }, created, published };
}

test("import fetches by code, saves the tournament and publishes TOURNAMENT_CREATED", async () => {
  const requested: string[] = [];
  const { deps, created, published } = harness({
    async fetchTournament(code) {
      requested.push(code);
      return padelMixFixture();
    }
  });

  const state = await importPadelMixTournament(deps, {
    url: "https://padelmix.app/live/STCSC6026I",
    organizerId: "org-1"
  });

  assert.deepEqual(requested, ["STCSC6026I"]);
  assert.equal(created.length, 1);
  assert.equal(created[0]!.id, state.id);
  assert.equal(created[0]!.organizerId, "org-1");
  assert.equal(published[0]?.type, "TOURNAMENT_CREATED");
});

test("import never calls PadelMix for a link that is not a PadelMix live link", async () => {
  let calls = 0;
  const { deps, created } = harness({
    async fetchTournament() {
      calls += 1;
      return padelMixFixture();
    }
  });

  await assert.rejects(
    importPadelMixTournament(deps, { url: "https://evil.example/live/STCSC6026I", organizerId: "org-1" }),
    (error: unknown) => isAppError(error) && error.httpStatus === 400
  );
  assert.equal(calls, 0);
  assert.equal(created.length, 0);
});

test("import saves nothing when PadelMix does not have the tournament", async () => {
  const { deps, created, published } = harness({
    async fetchTournament() {
      throw notFound("PadelMix tournament not found.");
    }
  });

  await assert.rejects(
    importPadelMixTournament(deps, { url: "NOPE1234", organizerId: "org-1" }),
    (error: unknown) => isAppError(error) && error.httpStatus === 404
  );
  assert.equal(created.length, 0);
  assert.equal(published.length, 0);
});

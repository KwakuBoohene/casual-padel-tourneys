import test from "node:test";
import assert from "node:assert/strict";

import {
  enableCareerShare,
  getCareerShare,
  revokeCareerShare,
  rotateCareerShare
} from "../../../src/modules/organizerPlayers/application/manageCareerShare.js";
import { readPublicCareerBoard } from "../../../src/modules/organizerPlayers/application/readPublicCareerBoard.js";
import type {
  OrganizerPlayerRepository,
  OrganizerPlayersDeps
} from "../../../src/modules/organizerPlayers/application/ports.js";
import type { CareerDelta } from "../../../src/modules/organizerPlayers/domain/careerStats.js";

function delta(overrides: Partial<CareerDelta> = {}): CareerDelta {
  return {
    organizerPlayerId: "p1",
    organizerPlayerName: "Ana",
    tournamentId: "t1",
    tournamentName: "Club Night",
    gamesWon: 0,
    gamesLost: 0,
    setsWon: 0,
    setsLost: 0,
    matchesWon: 1,
    matchesLost: 0,
    matchesDrawn: 0,
    americanoPointsWon: 16,
    americanoPointsLost: 8,
    ...overrides
  };
}

function deps(initial: string | null = null, deltas: CareerDelta[] = []) {
  const state = { token: initial };
  const repo = {
    async findShareToken() {
      return state.token;
    },
    async setShareToken(_organizerId: string, token: string | null) {
      state.token = token;
      return token;
    },
    async findOrganizerByShareToken(token: string) {
      return state.token && token === state.token ? { id: "org-1", name: "Kwaku Club" } : null;
    },
    async listDeltas() {
      return deltas;
    }
  } as unknown as OrganizerPlayerRepository;
  return { deps: { repo } as OrganizerPlayersDeps, state };
}

let counter = 0;
const nextToken = () => `career_test_${(counter += 1)}`;

test("a board starts un-shared", async () => {
  const { deps: d } = deps();
  assert.deepEqual(await getCareerShare(d, "org-1"), { token: null });
});

test("enabling twice keeps the same link", async () => {
  const { deps: d } = deps();
  const first = await enableCareerShare(d, "org-1", nextToken);
  const second = await enableCareerShare(d, "org-1", nextToken);
  assert.ok(first.token);
  assert.equal(second.token, first.token, "a live link must not be silently replaced");
});

test("rotating issues a new link", async () => {
  const { deps: d } = deps();
  const first = await enableCareerShare(d, "org-1", nextToken);
  const rotated = await rotateCareerShare(d, "org-1", nextToken);
  assert.notEqual(rotated.token, first.token);
});

test("the old link dies as soon as it is rotated", async () => {
  const { deps: d } = deps();
  const first = await enableCareerShare(d, "org-1", nextToken);
  await rotateCareerShare(d, "org-1", nextToken);
  assert.equal(await readPublicCareerBoard(d, first.token!, "year"), null);
});

test("revoking clears the link and the board 404s", async () => {
  const { deps: d } = deps(null, [delta()]);
  const enabled = await enableCareerShare(d, "org-1", nextToken);
  assert.ok(await readPublicCareerBoard(d, enabled.token!, "year"));

  assert.deepEqual(await revokeCareerShare(d, "org-1"), { token: null });
  assert.equal(await readPublicCareerBoard(d, enabled.token!, "year"), null);
});

test("re-enabling after revoke issues a different link", async () => {
  const { deps: d } = deps();
  const first = await enableCareerShare(d, "org-1", nextToken);
  await revokeCareerShare(d, "org-1");
  const second = await enableCareerShare(d, "org-1", nextToken);
  assert.notEqual(second.token, first.token);
});

test("an unknown token resolves to nothing", async () => {
  const { deps: d } = deps();
  await enableCareerShare(d, "org-1", nextToken);
  assert.equal(await readPublicCareerBoard(d, "career_not_mine", "year"), null);
});

test("the public board carries the standings and no identifiers", async () => {
  const { deps: d } = deps(null, [delta()]);
  const { token } = await enableCareerShare(d, "org-1", nextToken);

  const board = await readPublicCareerBoard(d, token!, "year");
  assert.ok(board);
  assert.equal(board!.organizerName, "Kwaku Club");
  assert.equal(board!.range, "year");
  assert.equal(board!.rows.length, 1);
  assert.equal(board!.rows[0].name, "Ana");

  const serialised = JSON.stringify(board);
  assert.doesNotMatch(serialised, /organizerId/);
  assert.doesNotMatch(serialised, /"id"/, "career identity ids must not be exposed");
  assert.doesNotMatch(serialised, /org-1/);
});

test("an organizer with no credited matches shares an empty board, not a 404", async () => {
  const { deps: d } = deps(null, []);
  const { token } = await enableCareerShare(d, "org-1", nextToken);
  const board = await readPublicCareerBoard(d, token!, "month");
  assert.ok(board);
  assert.deepEqual(board!.rows, []);
});

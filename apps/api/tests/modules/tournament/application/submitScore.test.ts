import test from "node:test";
import assert from "node:assert/strict";

import { submitPointsScore } from "../../../../src/modules/tournament/application/submitScore.js";
import { createTournamentState } from "../../../../src/modules/tournament/domain/createTournamentState.js";
import type { TournamentEvents, TournamentRepository } from "../../../../src/modules/tournament/application/ports.js";
import type { TournamentState } from "../../../../src/types/state.js";
import { conflict } from "../../../../src/shared/kernel/appError.js";

function memoryRepo(initial: TournamentState): TournamentRepository {
  const store = new Map<string, TournamentState>([[initial.id, structuredClone(initial)]]);
  return {
    async getById(id) {
      const row = store.get(id);
      return row ? structuredClone(row) : null;
    },
    async getByPublicToken() {
      return null;
    },
    async listByOrganizer() {
      return [];
    },
    async create(state) {
      store.set(state.id, structuredClone(state));
    },
    async save(state, expectedVersion) {
      const current = store.get(state.id);
      if (!current || current.version !== expectedVersion) {
        throw conflict("Version mismatch. Refresh tournament data.");
      }
      store.set(state.id, structuredClone(state));
    },
    async delete(id) {
      store.delete(id);
    }
  };
}

function sampleTournament(): TournamentState {
  return createTournamentState(
    {
      name: "Score Test",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      players: [
        { name: "A" },
        { name: "B" },
        { name: "C" },
        { name: "D" },
        { name: "E" },
        { name: "F" },
        { name: "G" },
        { name: "H" }
      ],
      courts: 2,
      pointsPerMatch: 24,
      targetGamesPerPlayer: 3
    },
    "owner-1"
  );
}

test("submitPointsScore happy path bumps version and publishes", async () => {
  const initial = sampleTournament();
  const matchId = initial.rounds[0].matches[0].id;
  const repo = memoryRepo(initial);
  const events: TournamentEvents = { async publish() {} };

  const updated = await submitPointsScore(
    { repo, events },
    {
      tournamentId: initial.id,
      organizerId: "owner-1",
      expectedVersion: 0,
      matchId,
      scoreA: 16,
      scoreB: 8
    }
  );

  assert.equal(updated.version, 1);
  assert.equal(updated.rounds[0].matches[0].completed, true);
});

test("submitPointsScore rejects stale version with conflict", async () => {
  const initial = sampleTournament();
  const matchId = initial.rounds[0].matches[0].id;
  const repo = memoryRepo(initial);
  const events: TournamentEvents = { async publish() {} };

  await assert.rejects(
    () =>
      submitPointsScore(
        { repo, events },
        {
          tournamentId: initial.id,
          organizerId: "owner-1",
          expectedVersion: 99,
          matchId,
          scoreA: 16,
          scoreB: 8
        }
      ),
    (error: unknown) => error instanceof Error && error.message.includes("Version mismatch")
  );
});

test("submitPointsScore hides other organizer tournaments", async () => {
  const initial = sampleTournament();
  const matchId = initial.rounds[0].matches[0].id;
  const repo = memoryRepo(initial);
  const events: TournamentEvents = { async publish() {} };

  await assert.rejects(
    () =>
      submitPointsScore(
        { repo, events },
        {
          tournamentId: initial.id,
          organizerId: "intruder",
          expectedVersion: 0,
          matchId,
          scoreA: 16,
          scoreB: 8
        }
      ),
    (error: unknown) => error instanceof Error && error.message.includes("not found")
  );
});

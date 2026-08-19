import test from "node:test";
import assert from "node:assert/strict";

import { closeTournament } from "../../../../src/modules/tournament/application/closeTournament.js";
import { createTournamentState } from "../../../../src/modules/tournament/domain/createTournamentState.js";
import type {
  TournamentEvents,
  TournamentRepository
} from "../../../../src/modules/tournament/application/ports.js";
import type { TournamentEvent } from "../../../../src/realtime/events.js";
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

function recordingEvents(): { events: TournamentEvents; published: TournamentEvent[] } {
  const published: TournamentEvent[] = [];
  return {
    events: {
      async publish(event) {
        published.push(event);
      }
    },
    published
  };
}

function sampleTournament(): TournamentState {
  return createTournamentState(
    {
      name: "Close Use Case",
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

test("closeTournament voids unplayed matches, ends the event and publishes", async () => {
  const initial = sampleTournament();
  const totalMatches = initial.rounds.flatMap((round) => round.matches).length;
  const repo = memoryRepo(initial);
  const { events, published } = recordingEvents();

  const result = await closeTournament(
    { repo, events },
    { tournamentId: initial.id, organizerId: "owner-1", expectedVersion: initial.version }
  );

  assert.equal(result.voidedMatchCount, totalMatches);
  assert.ok(result.tournament.endedAt);
  assert.equal(result.tournament.version, initial.version + 1);
  assert.equal(published.length, 1);
  assert.equal(published[0].type, "TOURNAMENT_ENDED");

  const persisted = await repo.getById(initial.id);
  assert.ok(persisted?.endedAt, "endedAt must be persisted");
  assert.ok(
    persisted!.rounds.flatMap((round) => round.matches).every((match) => match.voidedAt),
    "void marks must be persisted"
  );
});

test("closeTournament is idempotent for an already closed event", async () => {
  const initial = sampleTournament();
  const repo = memoryRepo(initial);
  const { events } = recordingEvents();

  const first = await closeTournament(
    { repo, events },
    { tournamentId: initial.id, organizerId: "owner-1", expectedVersion: initial.version }
  );
  assert.ok(first.voidedMatchCount > 0);

  const reloaded = (await repo.getById(initial.id))!;
  const second = recordingEvents();
  const result = await closeTournament(
    { repo, events: second.events },
    { tournamentId: initial.id, organizerId: "owner-1", expectedVersion: reloaded.version }
  );

  assert.equal(result.voidedMatchCount, 0);
  assert.equal(result.tournament.version, reloaded.version, "no version bump on a no-op close");
  assert.equal(second.published.length, 0, "no event for a no-op close");
});

test("closeTournament rejects a stale expectedVersion", async () => {
  const initial = sampleTournament();
  const repo = memoryRepo(initial);
  const { events, published } = recordingEvents();

  await assert.rejects(
    closeTournament(
      { repo, events },
      { tournamentId: initial.id, organizerId: "owner-1", expectedVersion: initial.version + 5 }
    ),
    /Version mismatch/
  );
  assert.equal(published.length, 0);

  const persisted = await repo.getById(initial.id);
  assert.equal(persisted?.endedAt ?? null, null, "a rejected close must not end the event");
});

test("closeTournament refuses a tournament owned by someone else", async () => {
  const initial = sampleTournament();
  const repo = memoryRepo(initial);
  const { events } = recordingEvents();

  await assert.rejects(
    closeTournament(
      { repo, events },
      { tournamentId: initial.id, organizerId: "someone-else", expectedVersion: initial.version }
    )
  );
});

test("closeTournament reports a partially played event correctly", async () => {
  const initial = sampleTournament();
  initial.rounds[0].matches[0].completed = true;
  const totalMatches = initial.rounds.flatMap((round) => round.matches).length;
  const repo = memoryRepo(initial);
  const { events } = recordingEvents();

  const result = await closeTournament(
    { repo, events },
    { tournamentId: initial.id, organizerId: "owner-1", expectedVersion: initial.version }
  );

  assert.equal(result.voidedMatchCount, totalMatches - 1);
  const persisted = (await repo.getById(initial.id))!;
  assert.equal(persisted.rounds[0].matches[0].voidedAt ?? null, null);
});

test("closeTournament voids every unplayed match but never a played one", async () => {
  const initial = sampleTournament();
  const playedId = initial.rounds[0].matches[0].id;
  initial.rounds[0].matches[0].completed = true;
  const totalMatches = initial.rounds.flatMap((round) => round.matches).length;
  const repo = memoryRepo(initial);
  const { events } = recordingEvents();

  const result = await closeTournament(
    { repo, events },
    { tournamentId: initial.id, organizerId: "owner-1", expectedVersion: initial.version }
  );

  assert.equal(result.voidedMatchCount, totalMatches - 1);
  const persisted = (await repo.getById(initial.id))!;
  const played = persisted.rounds
    .flatMap((round) => round.matches)
    .find((match) => match.id === playedId)!;
  assert.equal(played.voidedAt ?? null, null, "a played match is never voided");
});

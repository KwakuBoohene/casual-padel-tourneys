import test from "node:test";
import assert from "node:assert/strict";

import { createTournament } from "../../../../src/modules/tournament/application/createTournament.js";
import type { TournamentEvents, TournamentRepository } from "../../../../src/modules/tournament/application/ports.js";
import type { TournamentState } from "../../../../src/types/state.js";
import type { TournamentEvent } from "../../../../src/realtime/events.js";

function memoryRepo(): TournamentRepository & { store: Map<string, TournamentState> } {
  const store = new Map<string, TournamentState>();
  return {
    store,
    async getById(id) {
      return store.get(id) ?? null;
    },
    async getByPublicToken(token) {
      return [...store.values()].find((t) => t.publicToken === token) ?? null;
    },
    async listByOrganizer(organizerId) {
      return [...store.values()].filter((t) => t.organizerId === organizerId);
    },
    async create(state) {
      store.set(state.id, structuredClone(state));
    },
    async save(state) {
      store.set(state.id, structuredClone(state));
    },
    async delete(id) {
      store.delete(id);
    }
  };
}

test("createTournament saves aggregate and publishes TOURNAMENT_CREATED", async () => {
  const repo = memoryRepo();
  const published: TournamentEvent[] = [];
  const events: TournamentEvents = {
    async publish(event) {
      published.push(event);
    }
  };

  const tournament = await createTournament(
    { repo, events },
    {
      organizerId: "org-1",
      config: {
        name: "Friday",
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
      }
    }
  );

  assert.equal(tournament.organizerId, "org-1");
  assert.ok(tournament.publicToken);
  assert.ok(repo.store.has(tournament.id));
  assert.equal(published[0]?.type, "TOURNAMENT_CREATED");
});

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

test("createTournament saves Team Americano with fixed pairs", async () => {
  const repo = memoryRepo();
  const events: TournamentEvents = {
    async publish() {
      /* no-op */
    }
  };
  const teams = [
    { playerA: { name: "A1" }, playerB: { name: "A2" } },
    { playerA: { name: "B1" }, playerB: { name: "B2" } },
    { playerA: { name: "C1" }, playerB: { name: "C2" } },
    { playerA: { name: "D1" }, playerB: { name: "D2" } }
  ];

  const tournament = await createTournament(
    { repo, events },
    {
      organizerId: "org-team",
      config: {
        name: "Team Am",
        mode: "AMERICANO",
        variant: "TEAM",
        schedulingMode: "TARGET_GAMES",
        players: teams.flatMap((team) => [team.playerA, team.playerB]),
        teams,
        courts: 2,
        pointsPerMatch: 24,
        targetGamesPerPlayer: 2
      }
    }
  );

  assert.equal(tournament.config.variant, "TEAM");
  assert.equal(tournament.fixedPairs?.length, 4);
  assert.equal(tournament.players.length, 8);
  assert.ok(tournament.players.every((player) => Boolean(player.pairId)));
  assert.ok(tournament.rounds.length > 0);
  for (const match of tournament.rounds[0].matches) {
    const pairIds = match.teamA
      .concat(match.teamB)
      .map((id) => tournament.players.find((player) => player.id === id)?.pairId);
    assert.equal(new Set(pairIds.slice(0, 2)).size, 1);
    assert.equal(new Set(pairIds.slice(2, 4)).size, 1);
    assert.notEqual(pairIds[0], pairIds[2]);
  }
});

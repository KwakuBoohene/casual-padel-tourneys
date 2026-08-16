import { QueryClient } from "@tanstack/react-query";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LiveTournamentState } from "../../../src/types/organizer/tournament";
import {
  removeTournamentCaches,
  syncTournamentCaches,
  upsertTournamentInList
} from "../../../src/utilities/organizer/tournamentQueryCache";
import { tournamentQueryKeys } from "../../../src/utilities/organizer/tournamentQueryKeys";

function stubTournament(id: string, name: string): LiveTournamentState {
  return {
    id,
    publicToken: `tok-${id}`,
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    config: {
      name,
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      courts: 2,
      pointsPerMatch: 24
    },
    players: [],
    pendingPlayers: [],
    leaderboard: [],
    rounds: []
  };
}

function createMemoryQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

describe("tournamentQueryCache", () => {
  it("upserts new list items at the front and replaces in place", () => {
    const client = createMemoryQueryClient();
    const a = stubTournament("a", "A");
    const b = stubTournament("b", "B");
    upsertTournamentInList(client, a);
    upsertTournamentInList(client, b);
    assert.deepEqual(
      client.getQueryData(tournamentQueryKeys.list())?.map((t) => t.id),
      ["b", "a"]
    );
    upsertTournamentInList(client, { ...a, version: 2 });
    const list = client.getQueryData<LiveTournamentState[]>(tournamentQueryKeys.list()) ?? [];
    assert.equal(list[1]?.id, "a");
    assert.equal(list[1]?.version, 2);
    assert.equal(list[0]?.id, "b");
  });

  it("syncTournamentCaches writes detail and list; remove clears both", () => {
    const client = createMemoryQueryClient();
    const t = stubTournament("x", "X");
    syncTournamentCaches(client, t);
    assert.equal(client.getQueryData(tournamentQueryKeys.detail("x")), t);
    assert.equal(client.getQueryData<LiveTournamentState[]>(tournamentQueryKeys.list())?.[0]?.id, "x");
    removeTournamentCaches(client, "x");
    assert.equal(client.getQueryData(tournamentQueryKeys.detail("x")), undefined);
    assert.deepEqual(client.getQueryData(tournamentQueryKeys.list()), []);
  });
});

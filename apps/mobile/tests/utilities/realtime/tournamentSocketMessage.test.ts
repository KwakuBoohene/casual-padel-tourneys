import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isLiveTournamentPayload,
  parseTournamentSocketMessage
} from "../../../src/utilities/realtime/tournamentSocketMessage";

const sampleTournament = {
  id: "t1",
  publicToken: "pub",
  version: 1,
  updatedAt: "2026-01-01T00:00:00.000Z",
  config: {
    name: "Night",
    mode: "AMERICANO",
    variant: "CLASSIC",
    schedulingMode: "TARGET_GAMES",
    courts: 2,
    pointsPerMatch: 24
  },
  players: [{ id: "p1", name: "A" }],
  pendingPlayers: [],
  leaderboard: [],
  rounds: []
};

describe("parseTournamentSocketMessage", () => {
  it("extracts tournament state from channel envelope", () => {
    const raw = JSON.stringify({
      channel: "tournament:events",
      payload: {
        type: "SCORE_SUBMITTED",
        tournamentId: "t1",
        payload: sampleTournament
      }
    });
    const parsed = parseTournamentSocketMessage(raw);
    assert.equal(parsed.kind, "tournament");
    if (parsed.kind === "tournament") {
      assert.equal(parsed.data.id, "t1");
      assert.equal(parsed.data.publicToken, "pub");
    }
  });

  it("parses TOURNAMENT_DELETED", () => {
    const raw = JSON.stringify({
      channel: "tournament:events",
      payload: {
        type: "TOURNAMENT_DELETED",
        tournamentId: "t1",
        payload: { id: "t1" }
      }
    });
    const parsed = parseTournamentSocketMessage(raw);
    assert.deepEqual(parsed, { kind: "deleted", tournamentId: "t1" });
  });

  it("ignores malformed JSON and non-tournament payloads", () => {
    assert.equal(parseTournamentSocketMessage("not-json").kind, "ignore");
    assert.equal(
      parseTournamentSocketMessage(
        JSON.stringify({
          channel: "tournament:events",
          payload: { type: "KOH_HUB_UPDATED", tournamentId: "k1", payload: { courts: [] } }
        })
      ).kind,
      "ignore"
    );
  });

  it("isLiveTournamentPayload rejects incomplete objects", () => {
    assert.equal(isLiveTournamentPayload(null), false);
    assert.equal(isLiveTournamentPayload({ id: "x" }), false);
    assert.equal(isLiveTournamentPayload(sampleTournament), true);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { LiveTournamentState } from "../../../src/types/organizer/tournament";
import {
  buildScoreEntryFromPair,
  nextScoreEntryAfterChange,
  restoreScoreEntryUndo
} from "../../../src/utilities/organizer/scoreEntryTransitions";

function americanoTournament(): LiveTournamentState {
  return {
    id: "t1",
    publicToken: "pub",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    config: {
      name: "Night",
      mode: "AMERICANO",
      variant: "CLASSIC",
      schedulingMode: "TARGET_GAMES",
      courts: 1,
      pointsPerMatch: 24
    },
    players: [],
    pendingPlayers: [],
    leaderboard: [],
    rounds: []
  };
}

describe("scoreEntryTransitions", () => {
  it("buildScoreEntryFromPair marks Americano mode and empty undo", () => {
    const entry = buildScoreEntryFromPair(americanoTournament(), "m1", {
      scoreA: 12,
      scoreB: 12,
      sets: []
    });
    assert.equal(entry.scoringMode, "AMERICANO_POINTS");
    assert.equal(entry.matchId, "m1");
    assert.deepEqual(entry.undoStack, []);
    assert.equal(entry.scoreA, 12);
    assert.equal(entry.scoreB, 12);
  });

  it("nextScoreEntryAfterChange pushes undo then restoreScoreEntryUndo pops it", () => {
    const tournament = americanoTournament();
    const start = buildScoreEntryFromPair(tournament, "m1", {
      scoreA: 10,
      scoreB: 14,
      sets: []
    });
    const after = nextScoreEntryAfterChange(start, tournament, {
      scoreA: 15,
      scoreB: 9,
      sets: []
    });
    assert.equal(after.undoStack.length, 1);
    assert.equal(after.scoreA, 15);
    assert.equal(after.scoreB, 9);

    const restored = restoreScoreEntryUndo(after, tournament);
    assert.ok(restored);
    assert.equal(restored.scoreA, 10);
    assert.equal(restored.scoreB, 14);
    assert.equal(restored.undoStack.length, 0);
  });

  it("restoreScoreEntryUndo returns null when stack empty", () => {
    const tournament = americanoTournament();
    const start = buildScoreEntryFromPair(tournament, "m1", {
      scoreA: 0,
      scoreB: 24,
      sets: []
    });
    assert.equal(restoreScoreEntryUndo(start, tournament), null);
  });
});

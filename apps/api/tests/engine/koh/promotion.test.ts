import assert from "node:assert/strict";
import test from "node:test";

import {
  findWeakestCandidates,
  maybePromote,
  type KohEngineCourt,
  type KohEngineUnit
} from "../../../src/engine/koh/index.js";

function unit(id: string, overrides: Partial<KohEngineUnit> = {}): KohEngineUnit {
  return {
    id,
    playerAId: `${id}-a`,
    playerBId: `${id}-b`,
    matchesWon: 0,
    matchesLost: 0,
    kingWinStreak: 0,
    ...overrides
  };
}

test("single court never promotes", () => {
  const courts: KohEngineCourt[] = [
    {
      id: "c1",
      courtNumber: 1,
      queue: [unit("k", { kingWinStreak: 5, matchesWon: 5 })]
    }
  ];
  const result = maybePromote({
    courts,
    rules: [{ courtNumber: 1, winsRequired: 2 }],
    fromCourtNumber: 1
  });
  assert.equal(result.notify, null);
  assert.equal(result.courts[0]?.queue[0]?.id, "k");
});

test("promo off when streak below winsRequired", () => {
  const courts: KohEngineCourt[] = [
    { id: "c1", courtNumber: 1, queue: [unit("top"), unit("t2")] },
    {
      id: "c2",
      courtNumber: 2,
      queue: [unit("low", { kingWinStreak: 1, matchesWon: 1 }), unit("l2")]
    }
  ];
  const result = maybePromote({
    courts,
    rules: [{ courtNumber: 2, winsRequired: 3 }],
    fromCourtNumber: 2
  });
  assert.equal(result.notify, null);
});

test("promo swaps king with weakest on upper court", () => {
  const courts: KohEngineCourt[] = [
    {
      id: "c1",
      courtNumber: 1,
      queue: [
        unit("strong", { matchesWon: 4, matchesLost: 0 }),
        unit("weak", { matchesWon: 0, matchesLost: 3 })
      ]
    },
    {
      id: "c2",
      courtNumber: 2,
      queue: [unit("climber", { kingWinStreak: 3, matchesWon: 3 }), unit("other")]
    }
  ];
  const result = maybePromote({
    courts,
    rules: [{ courtNumber: 2, winsRequired: 3 }],
    fromCourtNumber: 2
  });
  assert.ok(result.notify);
  assert.equal(result.notify?.type, "PROMOTED");
  if (result.notify?.type === "PROMOTED") {
    assert.equal(result.notify.promotedUnitId, "climber");
    assert.equal(result.notify.demotedUnitId, "weak");
  }
  const upper = result.courts.find((c) => c.courtNumber === 1);
  const lower = result.courts.find((c) => c.courtNumber === 2);
  assert.ok(upper?.queue.some((u) => u.id === "climber"));
  assert.ok(lower?.queue.some((u) => u.id === "weak"));
  assert.ok(!upper?.queue.some((u) => u.id === "weak"));
  assert.ok(!lower?.queue.some((u) => u.id === "climber"));
});

test("promo tie for weakest returns needsOrganizerPick", () => {
  const courts: KohEngineCourt[] = [
    {
      id: "c1",
      courtNumber: 1,
      queue: [
        unit("a", { matchesWon: 1, matchesLost: 2, specialLosses: 1 }),
        unit("b", { matchesWon: 1, matchesLost: 2, specialLosses: 1 })
      ]
    },
    {
      id: "c2",
      courtNumber: 2,
      queue: [unit("climber", { kingWinStreak: 2, matchesWon: 2 })]
    }
  ];
  const result = maybePromote({
    courts,
    rules: [{ courtNumber: 2, winsRequired: 2 }],
    fromCourtNumber: 2
  });
  assert.equal(result.notify?.type, "NEEDS_ORGANIZER_PICK");
  if (result.notify?.type === "NEEDS_ORGANIZER_PICK") {
    assert.deepEqual([...result.notify.candidateUnitIds].sort(), ["a", "b"]);
  }
  // Courts unchanged until organizer picks.
  assert.equal(result.courts.find((c) => c.courtNumber === 2)?.queue[0]?.id, "climber");
});

test("findWeakestCandidates prefers worse W–L then more special losses", () => {
  const court: KohEngineCourt = {
    id: "c1",
    courtNumber: 1,
    queue: [
      unit("ok", { matchesWon: 3, matchesLost: 1, specialLosses: 5 }),
      unit("bad", { matchesWon: 1, matchesLost: 4, specialLosses: 0 }),
      unit("worseSpecial", { matchesWon: 1, matchesLost: 4, specialLosses: 2 })
    ]
  };
  const weakest = findWeakestCandidates(court);
  assert.equal(weakest.length, 1);
  assert.equal(weakest[0]?.id, "worseSpecial");
});

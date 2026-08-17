import assert from "node:assert/strict";
import test from "node:test";

import { formatRegularMatchScore, formatRegularSetScore } from "../../app/tournament/[id]/lib/regularMatchDisplay";

test("formatRegularSetScore appends Golden or Star when methods are stored", () => {
  assert.equal(formatRegularSetScore({ setNumber: 1, gamesA: 6, gamesB: 4 }), "6–4");
  assert.equal(
    formatRegularSetScore({
      setNumber: 1,
      gamesA: 6,
      gamesB: 4,
      winMethodsA: ["REGULAR", "GOLDEN"]
    }),
    "6–4 · Golden"
  );
  assert.equal(
    formatRegularMatchScore([
      { setNumber: 1, gamesA: 6, gamesB: 4, winMethodsB: ["STAR"] },
      { setNumber: 2, gamesA: 3, gamesB: 6 }
    ]),
    "6–4 · Star, 3–6"
  );
});

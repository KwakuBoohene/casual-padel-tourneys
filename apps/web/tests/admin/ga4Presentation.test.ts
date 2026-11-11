import assert from "node:assert/strict";
import test from "node:test";
import type { Ga4ViewerReport } from "@padel/shared";
import { comparison, percent, sessionTrend, share } from "../../lib/admin/ga4Presentation";

test("GA4 comparisons distinguish zero baselines, missing rates and percentage points", () => {
  assert.equal(comparison(5, 0), "+5 vs prior period · percentage unavailable");
  assert.equal(comparison(0, 0), "0 vs prior period · percentage unavailable");
  assert.equal(comparison(80, 100), "-20.0% vs prior period");
  assert.equal(comparison(0.624, 0.592, true), "+3.2 pp vs prior period");
  assert.equal(comparison(null, 0.5, true), "Comparison unavailable");
  assert.equal(percent(null), "Unavailable");
});
test("shares use provider totals even when breakdown rows are withheld", () => {
  assert.equal(share(20, 100), "20.0%");
  assert.equal(share(20, 0), "Unavailable");
});
test("trends align prior calendar days by position and never fabricate missing prior data", () => {
  const data = {
    daily: [
      { date: "2026-11-09", sessions: 10 },
      { date: "2026-11-10", sessions: 0 }
    ],
    previousDaily: [
      { date: "2026-11-07", sessions: 5 },
      { date: "2026-11-08", sessions: 3 }
    ]
  } as Ga4ViewerReport;
  assert.deepEqual(sessionTrend(data), [
    { date: "2026-11-09", sessions: 10, previousDate: "2026-11-07", previous: 5 },
    { date: "2026-11-10", sessions: 0, previousDate: "2026-11-08", previous: 3 }
  ]);
  assert.deepEqual(
    sessionTrend({ ...data, previousDaily: undefined } as unknown as Ga4ViewerReport).map(
      (point) => point.previous
    ),
    [null, null]
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { fitText } from "../../../src/shared/export/fitText.js";
import {
  PAGE,
  cardRows,
  layoutSchedule,
  roundHeight,
  roundRangeLabel
} from "../../../src/shared/export/matchScheduleLayout.js";

const twoCourts = { courtCount: 2, restTextHeight: 11 };

test("two-court rounds fit three on page one and four after", () => {
  const pages = layoutSchedule(Array.from({ length: 8 }, () => twoCourts));
  assert.deepEqual(pages.map((page) => page.rounds.length), [3, 4, 1]);
});

test("no round crosses the bottom margin", () => {
  const pages = layoutSchedule(Array.from({ length: 12 }, (_, i) => ({ courtCount: 1 + (i % 4), restTextHeight: 11 })));
  for (const page of pages) {
    for (const round of page.rounds) {
      assert.ok(round.y + round.height <= PAGE.height - PAGE.margin, `round ${round.index} overflows`);
    }
  }
  assert.equal(pages.flatMap((page) => page.rounds).length, 12, "every round placed once");
});

test("courts wrap two per row and the rest strip is optional", () => {
  assert.equal(cardRows(1), 1);
  assert.equal(cardRows(3), 2);
  assert.ok(roundHeight({ courtCount: 3, restTextHeight: 0 }) > roundHeight({ courtCount: 2, restTextHeight: 0 }));
  assert.ok(roundHeight(twoCourts) > roundHeight({ courtCount: 2, restTextHeight: 0 }));
});

test("an oversized round still gets its own page", () => {
  const pages = layoutSchedule([twoCourts, { courtCount: 16, restTextHeight: 11 }]);
  assert.equal(pages.length, 2);
  assert.equal(pages[1].rounds[0].index, 1);
});

test("running header range label", () => {
  assert.equal(roundRangeLabel(4, 7), "Rounds 4–7");
  assert.equal(roundRangeLabel(8, 8), "Round 8");
});

test("fitText shrinks before it truncates", () => {
  const measure = (text: string, size: number): number => text.length * size * 0.5;
  assert.deepEqual(fitText(measure, "Ana", 100, 12, 10), { text: "Ana", size: 12 });
  assert.deepEqual(fitText(measure, "Maximiliano", 60, 12, 10), { text: "Maximiliano", size: 10.5 });
  const cut = fitText(measure, "Maximiliano Fernandez", 60, 12, 10);
  assert.equal(cut.size, 10);
  assert.ok(cut.text.endsWith("…"));
  assert.ok(measure(cut.text, cut.size) <= 60);
});

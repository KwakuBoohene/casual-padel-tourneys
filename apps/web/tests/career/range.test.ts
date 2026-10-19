import assert from "node:assert/strict";
import test from "node:test";

import { CAREER_RANGES, parseCareerRange } from "../../app/c/[token]/range";

test("the three supported periods are offered", () => {
  assert.deepEqual(
    CAREER_RANGES.map((range) => range.id),
    ["month", "year", "all"]
  );
});

test("each period has readable copy, never the internal word", () => {
  for (const range of CAREER_RANGES) {
    assert.ok(range.label.length > 0);
    assert.doesNotMatch(range.label, /career|account/i);
  }
});

test("a valid range in the url is honoured", () => {
  assert.equal(parseCareerRange("month"), "month");
  assert.equal(parseCareerRange("year"), "year");
  assert.equal(parseCareerRange("all"), "all");
});

test("a missing or nonsense range falls back rather than erroring the page", () => {
  assert.equal(parseCareerRange(undefined), "year");
  assert.equal(parseCareerRange(""), "year");
  assert.equal(parseCareerRange("decade"), "year");
  assert.equal(parseCareerRange("../../etc/passwd"), "year");
});

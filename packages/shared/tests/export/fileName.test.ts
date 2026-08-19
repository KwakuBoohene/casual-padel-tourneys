import test from "node:test";
import assert from "node:assert/strict";

import {
  exportContentType,
  exportFileName,
  slugifyForFileName
} from "../../src/export/fileName.js";

test("slug lowercases, strips accents and collapses separators", () => {
  assert.equal(slugifyForFileName("Tuesday Night"), "tuesday-night");
  assert.equal(slugifyForFileName("José's Ånd  Co."), "jose-s-and-co");
  assert.equal(slugifyForFileName("a/b\\c:d"), "a-b-c-d");
});

test("slug never ends in a separator and never returns empty", () => {
  assert.equal(slugifyForFileName("!!!"), "export");
  assert.equal(slugifyForFileName(""), "export");
  assert.ok(!slugifyForFileName("Trailing --- ").endsWith("-"));
});

test("very long names are truncated but stay readable", () => {
  const slug = slugifyForFileName("x".repeat(200));
  assert.ok(slug.length <= 60);
});

test("filename carries kind, date and extension", () => {
  assert.equal(
    exportFileName("leaderboard", "Tuesday Night", "2026-08-19", "csv"),
    "tuesday-night-leaderboard-2026-08-19.csv"
  );
  assert.equal(
    exportFileName("matches", "Tuesday Night", "2026-08-19T18:30:00.000Z", "pdf"),
    "tuesday-night-matches-2026-08-19.pdf"
  );
});

test("content types match the format", () => {
  assert.equal(exportContentType("csv"), "text/csv; charset=utf-8");
  assert.equal(exportContentType("pdf"), "application/pdf");
});

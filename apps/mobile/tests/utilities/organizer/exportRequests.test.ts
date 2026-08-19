import test from "node:test";
import assert from "node:assert/strict";

import {
  exportCacheFileName,
  exportMimeType,
  exportRequestPath,
  exportSheetSubtitle
} from "../../../src/utilities/organizer/exportRequests";

test("tournament export hits the organizer route with the format", () => {
  assert.equal(
    exportRequestPath({ dataset: "tournament", format: "csv", tournamentId: "t_1" }),
    "/tournaments/t_1/export?format=csv"
  );
  assert.equal(
    exportRequestPath({ dataset: "tournament", format: "pdf", tournamentId: "t_1" }),
    "/tournaments/t_1/export?format=pdf"
  );
});

test("a tournament id with url characters is encoded", () => {
  assert.equal(
    exportRequestPath({ dataset: "tournament", format: "csv", tournamentId: "a/b c" }),
    "/tournaments/a%2Fb%20c/export?format=csv"
  );
});

test("a tournament export without an id fails loudly rather than hitting a wrong url", () => {
  assert.throws(
    () => exportRequestPath({ dataset: "tournament", format: "csv" }),
    /needs a tournament id/
  );
});

test("account exports carry the selected range", () => {
  assert.equal(
    exportRequestPath({ dataset: "careerLeaderboard", format: "pdf", range: "month" }),
    "/me/players/leaderboard/export?format=pdf&range=month"
  );
  assert.equal(
    exportRequestPath({ dataset: "careerMatches", format: "csv", range: "all" }),
    "/me/players/matches/export?format=csv&range=all"
  );
});

test("account exports default to the year range", () => {
  assert.match(
    exportRequestPath({ dataset: "careerLeaderboard", format: "csv" }),
    /range=year$/
  );
});

test("cache filenames are unique per export so repeats do not collide", () => {
  const a = exportCacheFileName(
    { dataset: "tournament", format: "csv", tournamentId: "t" },
    "Tuesday Night",
    "2026-08-19T18:30:00.000Z"
  );
  const b = exportCacheFileName(
    { dataset: "tournament", format: "csv", tournamentId: "t" },
    "Tuesday Night",
    "2026-08-19T19:45:10.000Z"
  );
  assert.notEqual(a, b, "two exports in one session must not share a cache file");
  assert.ok(a.endsWith(".csv"));
  assert.ok(a.startsWith("tuesday-night-leaderboard-2026-08-19"));
});

test("the matches dataset is named as such in the file", () => {
  const name = exportCacheFileName(
    { dataset: "careerMatches", format: "pdf", range: "all" },
    "account",
    "2026-08-19T18:30:00.000Z"
  );
  assert.match(name, /account-matches-2026-08-19/);
  assert.ok(name.endsWith(".pdf"));
});

test("mime types match the format", () => {
  assert.equal(exportMimeType("csv"), "text/csv");
  assert.equal(exportMimeType("pdf"), "application/pdf");
});

test("the sheet says exactly which slice is leaving the app", () => {
  assert.match(exportSheetSubtitle({ dataset: "tournament" }), /this tournament/i);
  assert.match(
    exportSheetSubtitle({ dataset: "careerLeaderboard", range: "month" }),
    /account leaderboard for this month/i
  );
  assert.match(
    exportSheetSubtitle({ dataset: "careerMatches", range: "all" }),
    /every match .* for all time/i
  );
});

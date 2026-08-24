import test from "node:test";
import assert from "node:assert/strict";

import {
  exportCacheFileName,
  exportMimeType,
  exportRequestPath,
  exportSheetSubtitle,
  fileNameFromContentDisposition
} from "../../../src/utilities/organizer/exportRequests";

test("tournament export hits the organizer route with the format", () => {
  assert.equal(
    exportRequestPath({ dataset: "tournament", format: "csv", tournamentId: "t_1" }),
    "/tournaments/t_1/export?format=csv&scope=full"
  );
  assert.equal(
    exportRequestPath({ dataset: "tournament", format: "pdf", tournamentId: "t_1" }),
    "/tournaments/t_1/export?format=pdf&scope=full"
  );
});

test("a tournament id with url characters is encoded", () => {
  assert.equal(
    exportRequestPath({ dataset: "tournament", format: "csv", tournamentId: "a/b c" }),
    "/tournaments/a%2Fb%20c/export?format=csv&scope=full"
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
    "/me/players/leaderboard/export?format=pdf&range=month&scope=full"
  );
  assert.equal(
    exportRequestPath({ dataset: "careerMatches", format: "csv", range: "all" }),
    "/me/players/matches/export?format=csv&range=all"
  );
});

test("account exports default to the year range", () => {
  assert.match(
    exportRequestPath({ dataset: "careerLeaderboard", format: "csv" }),
    /range=year&scope=full$/
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
  assert.ok(a.startsWith("tuesday-night-full-2026-08-19"));
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
  assert.match(
    exportSheetSubtitle({ dataset: "careerLeaderboard", range: "month", scope: "leaderboard" }),
    /account leaderboard for this month/i
  );
  assert.match(
    exportSheetSubtitle({ dataset: "careerMatches", range: "all" }),
    /every match .* for all time/i
  );
});

test("reads the filename the server chose", () => {
  assert.equal(
    fileNameFromContentDisposition('attachment; filename="tuesday-night-leaderboard-2026-08-19.csv"'),
    "tuesday-night-leaderboard-2026-08-19.csv"
  );
  assert.equal(
    fileNameFromContentDisposition("attachment; filename=plain-name.csv"),
    "plain-name.csv"
  );
});

test("an unreadable header yields null so the caller uses its own name", () => {
  // A cross-origin fetch sees null unless the API exposes Content-Disposition via CORS.
  assert.equal(fileNameFromContentDisposition(null), null);
  assert.equal(fileNameFromContentDisposition(""), null);
  assert.equal(fileNameFromContentDisposition("attachment"), null);
});

test("the cache filename is built from the tournament name, safely", () => {
  const name = exportCacheFileName(
    { dataset: "tournament", format: "pdf", tournamentId: "t" },
    'Ana"s /../ Night',
    "2026-08-19T18:30:00.000Z"
  );
  assert.match(name, /^[a-z0-9.-]+$/, `unsafe characters leaked: ${name}`);
  assert.ok(name.startsWith("ana-s-night-full"));
  assert.ok(name.endsWith(".pdf"));
});

test("scope narrows the request and names the file", () => {
  assert.equal(
    exportRequestPath({ dataset: "tournament", format: "csv", tournamentId: "t", scope: "leaderboard" }),
    "/tournaments/t/export?format=csv&scope=leaderboard"
  );
  assert.equal(
    exportRequestPath({ dataset: "careerLeaderboard", format: "csv", range: "year", scope: "leaderboard" }),
    "/me/players/leaderboard/export?format=csv&range=year&scope=leaderboard"
  );
  const leaderboardOnly = exportCacheFileName(
    { dataset: "tournament", format: "csv", tournamentId: "t", scope: "leaderboard" },
    "Night",
    "2026-08-19T18:30:00.000Z"
  );
  assert.ok(leaderboardOnly.startsWith("night-leaderboard-"), leaderboardOnly);
});

test("the matches dataset ignores scope — it has one shape", () => {
  assert.equal(
    exportRequestPath({ dataset: "careerMatches", format: "csv", range: "all", scope: "leaderboard" }),
    "/me/players/matches/export?format=csv&range=all"
  );
});

test("the sheet copy distinguishes the two scopes", () => {
  assert.match(exportSheetSubtitle({ dataset: "tournament", scope: "leaderboard" }), /standings only/i);
  assert.match(exportSheetSubtitle({ dataset: "tournament", scope: "full" }), /every round, match and score/i);
  assert.match(
    exportSheetSubtitle({ dataset: "careerLeaderboard", range: "month", scope: "full" }),
    /with its tournaments and matches/i
  );
});

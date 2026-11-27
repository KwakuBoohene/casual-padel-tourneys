import test from "node:test";
import assert from "node:assert/strict";

import { isExportScope, parseExportScope } from "../../src/export/exportScope.js";

test("scope defaults to full", () => {
  assert.equal(parseExportScope(undefined), "full");
});

test("both scopes are accepted, case-insensitively", () => {
  assert.equal(parseExportScope("leaderboard"), "leaderboard");
  assert.equal(parseExportScope("full"), "full");
  assert.equal(parseExportScope("FULL"), "full");
});

test("an unknown scope is rejected and names what is supported", () => {
  assert.throws(() => parseExportScope("everything"), /Supported: leaderboard, full/);
});

test("the guard narrows correctly", () => {
  assert.equal(isExportScope("full"), true);
  assert.equal(isExportScope("nope"), false);
  assert.equal(isExportScope(undefined), false);
});

test("tournament exports also accept schedule; career scope does not", async () => {
  const { parseTournamentExportScope } = await import("../../src/export/exportScope.js");
  assert.equal(parseTournamentExportScope("schedule"), "schedule");
  assert.equal(parseTournamentExportScope(undefined), "full");
  assert.throws(() => parseTournamentExportScope("everything"), /Supported: leaderboard, full, schedule/);
  assert.throws(() => parseExportScope("schedule"), /Supported: leaderboard, full/);
});

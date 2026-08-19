import test from "node:test";
import assert from "node:assert/strict";

import { escapeCsvField, toCsv, UTF8_BOM } from "../../src/export/csv.js";
import type { ExportTable } from "../../src/export/exportTable.js";

function table(overrides: Partial<ExportTable> = {}): ExportTable {
  return {
    title: "Board",
    headers: ["A", "B"],
    rows: [["1", "2"]],
    ...overrides
  };
}

test("UTF8_BOM is the byte order mark", () => {
  assert.equal(UTF8_BOM, "﻿");
  assert.equal(UTF8_BOM.length, 1);
});

test("plain fields are written unquoted", () => {
  assert.equal(escapeCsvField("Ana"), "Ana");
  assert.equal(escapeCsvField("16"), "16");
});

test("fields containing a comma, quote or newline are quoted per RFC 4180", () => {
  assert.equal(escapeCsvField("O'Brien, Jr."), '"O\'Brien, Jr."');
  assert.equal(escapeCsvField('He said "hi"'), '"He said ""hi"""');
  assert.equal(escapeCsvField("line1\nline2"), '"line1\nline2"');
  assert.equal(escapeCsvField("line1\r\nline2"), '"line1\r\nline2"');
});

test("formula-shaped values are neutralised so spreadsheets do not execute them", () => {
  assert.equal(escapeCsvField("=cmd|'/c calc'!A0"), "'=cmd|'/c calc'!A0");
  assert.equal(escapeCsvField("+1"), "'+1");
  assert.equal(escapeCsvField("-1"), "'-1");
  assert.equal(escapeCsvField("@SUM(A1)"), "'@SUM(A1)");
  // A negative number that is genuinely data still must not execute.
  assert.ok(escapeCsvField("-5").startsWith("'"));
});

test("csv emits a BOM and CRLF line endings", () => {
  const csv = toCsv(table());
  assert.ok(csv.startsWith(UTF8_BOM));
  assert.equal(csv, `${UTF8_BOM}A,B\r\n1,2\r\n`);
});

test("a note is appended after a blank line rather than silently dropped", () => {
  const csv = toCsv(table({ note: "Truncated at 5000 rows." }));
  assert.ok(csv.endsWith("\r\n\r\nTruncated at 5000 rows.\r\n"));
});

test("an empty table still writes its header row", () => {
  const csv = toCsv(table({ rows: [] }));
  assert.equal(csv, `${UTF8_BOM}A,B\r\n`);
});

test("non-ascii names survive intact", () => {
  const csv = toCsv(table({ rows: [["José", "Ångström"]] }));
  assert.ok(csv.includes("José"));
  assert.ok(csv.includes("Ångström"));
});

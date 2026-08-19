import test from "node:test";
import assert from "node:assert/strict";
import { buildLeaderboardExport, buildMatchesExport, type ExportTable } from "@padel/shared";

import { renderExportTablePdf } from "../../../src/shared/export/PdfExportRenderer.js";
import { layoutColumns } from "../../../src/shared/export/pdfTableLayout.js";

function boardOf(count: number): ExportTable {
  return buildLeaderboardExport(
    Array.from({ length: count }, (_, i) => ({
      rank: i + 1,
      name: `Player ${i + 1}`,
      wins: count - i,
      losses: i,
      draws: 0,
      gamesWon: 10,
      gamesLost: 5,
      americanoPointsWon: 100,
      americanoPointsLost: 80
    })),
    { title: "Night", subtitle: "Americano scoring · 4 rounds" }
  );
}

async function toBuffer(table: ExportTable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of renderExportTablePdf(table)) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  return Buffer.concat(chunks);
}

function pageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

test("renders a valid PDF", async () => {
  const pdf = await toBuffer(boardOf(8));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 1000);
});

test("a small board fits on one page", async () => {
  assert.equal(pageCount(await toBuffer(boardOf(8))), 1);
});

test("a 48-player board paginates", async () => {
  assert.ok(pageCount(await toBuffer(boardOf(48))) >= 2);
});

test("an empty board still renders its header page", async () => {
  const pdf = await toBuffer(boardOf(0));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.equal(pageCount(pdf), 1);
});

test("a long accented name does not break rendering", async () => {
  const table = buildLeaderboardExport(
    [
      {
        rank: 1,
        name: "Maximiliano Fernández-Rodríguez de la Vega",
        wins: 1,
        losses: 0,
        gamesWon: 6,
        gamesLost: 4
      }
    ],
    { title: "Night" }
  );
  const pdf = await toBuffer(table);
  assert.ok(pdf.length > 1000);
});

test("columns never exceed the available width and keep a usable minimum", () => {
  const table = boardOf(5);
  const measure = (text: string, size: number) => text.length * size * 0.5;
  const available = 515;
  const columns = layoutColumns(measure, table, available, 9, 9);

  assert.equal(columns.length, table.headers.length);
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  assert.ok(Math.abs(total - available) < 0.01, `columns should fill ${available}, got ${total}`);
  assert.ok(columns.every((column) => column.width >= 26));
});

test("figures align right and names align left, derived from the data", () => {
  const columns = layoutColumns((text, size) => text.length * size * 0.5, boardOf(3), 515, 9, 9);
  const byHeader = Object.fromEntries(
    boardOf(3).headers.map((header, index) => [header, columns[index]])
  );
  assert.equal(byHeader.Player.align, "left", "names are text");
  assert.equal(byHeader["#"].align, "right", "rank is a figure");
  for (const header of ["MP", "W", "L", "GW", "GD", "PW(A)", "PTS"]) {
    assert.equal(byHeader[header].align, "right", header);
  }
});

test("a matches-style table keeps its date and text columns left-aligned", () => {
  const table = buildMatchesExport(
    [
      {
        occurredAt: "2026-08-19T18:30:00.000Z",
        tournamentName: "Tuesday Night",
        tournamentMode: "AMERICANO",
        playerName: "Ana",
        matchesWon: 1,
        matchesLost: 0,
        matchesDrawn: 0,
        gamesWon: 0,
        gamesLost: 0,
        americanoPointsWon: 16,
        americanoPointsLost: 8
      }
    ],
    { title: "Matches" }
  );
  const columns = layoutColumns((text, size) => text.length * size * 0.5, table, 515, 9, 9);
  const byHeader = Object.fromEntries(table.headers.map((h, i) => [h, columns[i]]));
  assert.equal(byHeader.Date.align, "left");
  assert.equal(byHeader.Tournament.align, "left");
  assert.equal(byHeader.Mode.align, "left");
  assert.equal(byHeader.Player.align, "left");
  assert.equal(byHeader.MP.align, "right");
});

test("spare width is shared across text columns, not dumped into one", () => {
  const table = boardOf(3);
  const columns = layoutColumns((text, size) => text.length * size * 0.5, table, 900, 9, 9);
  const widest = Math.max(...columns.map((c) => c.width));
  const narrowest = Math.min(...columns.map((c) => c.width));
  assert.ok(widest / narrowest < 6, `one column ballooned: ${widest} vs ${narrowest}`);
});

test("a very narrow page still yields ordered, non-overlapping columns", () => {
  const columns = layoutColumns((text, size) => text.length * size * 0.5, boardOf(3), 120, 9, 9);
  for (let i = 1; i < columns.length; i += 1) {
    assert.ok(
      columns[i].x >= columns[i - 1].x + columns[i - 1].width - 0.01,
      "columns must not overlap"
    );
  }
});

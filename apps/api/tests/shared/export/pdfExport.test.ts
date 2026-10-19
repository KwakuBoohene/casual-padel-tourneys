import test from "node:test";
import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import { buildLeaderboardExport, buildMatchesExport, type ExportTable } from "@padel/shared";

import { renderExportTablePdf } from "../../../src/shared/export/PdfExportRenderer.js";
import {
  CELL_PADDING,
  fitTableFontSizes,
  layoutColumns
} from "../../../src/shared/export/pdfTableLayout.js";

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
  const columns = layoutColumns(measure, table.sections[0], available, 9, 9);

  assert.equal(columns.length, table.sections[0].headers.length);
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  assert.ok(Math.abs(total - available) < 0.01, `columns should fill ${available}, got ${total}`);
  assert.ok(columns.every((column) => column.width >= 26));
});

test("figures align right and names align left, derived from the data", () => {
  const columns = layoutColumns((text, size) => text.length * size * 0.5, boardOf(3).sections[0], 515, 9, 9);
  const byHeader = Object.fromEntries(
    boardOf(3).sections[0].headers.map((header, index) => [header, columns[index]])
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
  const columns = layoutColumns((text, size) => text.length * size * 0.5, table.sections[0], 515, 9, 9);
  const byHeader = Object.fromEntries(table.sections[0].headers.map((h, i) => [h, columns[i]]));
  assert.equal(byHeader.Date.align, "left");
  assert.equal(byHeader.Tournament.align, "left");
  assert.equal(byHeader.Mode.align, "left");
  assert.equal(byHeader.Player.align, "left");
  assert.equal(byHeader.MP.align, "right");
});

test("spare width is shared across text columns, not dumped into one", () => {
  const table = boardOf(3);
  const columns = layoutColumns((text, size) => text.length * size * 0.5, table.sections[0], 900, 9, 9);
  const widest = Math.max(...columns.map((c) => c.width));
  const narrowest = Math.min(...columns.map((c) => c.width));
  assert.ok(widest / narrowest < 6, `one column ballooned: ${widest} vs ${narrowest}`);
});

test("a very narrow page still yields ordered, non-overlapping columns", () => {
  const columns = layoutColumns((text, size) => text.length * size * 0.5, boardOf(3).sections[0], 120, 9, 9);
  for (let i = 1; i < columns.length; i += 1) {
    assert.ok(
      columns[i].x >= columns[i - 1].x + columns[i - 1].width - 0.01,
      "columns must not overlap"
    );
  }
});

// --- fitting wide tables to the page -----------------------------------------------------------

/**
 * A4 portrait minus both margins — the width the renderer actually has to work with.
 * Measured with the same Helvetica metrics the renderer uses.
 */
const A4_AVAILABLE = 595.28 - 40 * 2;

/**
 * A board with names of the length real organizers actually enter. `boardOf` uses "Player 1",
 * which is short enough that 14 columns still fit at 9pt — it is the long names that force the
 * squeeze, so the fitting tests need a fixture that reflects that.
 */
function wideBoard(): ExportTable {
  return buildLeaderboardExport(
    [
      { rank: 1, name: "Ana Beatriz Fernandes", wins: 9, losses: 1, draws: 0, gamesWon: 54, gamesLost: 21, americanoPointsWon: 0, americanoPointsLost: 0 },
      { rank: 2, name: "Wilhelmina Vandersteen", wins: 6, losses: 3, draws: 1, gamesWon: 44, gamesLost: 36, americanoPointsWon: 128, americanoPointsLost: 110 },
      { rank: 3, name: "Jean-Luc D'Artagnan-Smythe", wins: 5, losses: 5, draws: 0, gamesWon: 0, gamesLost: 0, americanoPointsWon: 240, americanoPointsLost: 236 }
    ],
    { title: "Friday Night Padel" }
  );
}

function helveticaMeasure(): (text: string, size: number) => number {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  return (text: string, size: number) => doc.fontSize(size).widthOfString(text ?? "");
}

test("a table that already fits keeps the default type size", () => {
  const measure = helveticaMeasure();
  const narrow = { headers: ["#", "Player", "Score"], rows: [["1", "Ana", "6-2"]] };
  assert.deepEqual(fitTableFontSizes(measure, narrow, A4_AVAILABLE, 9, 9), {
    headerSize: 9,
    bodySize: 9
  });
});

test("the full leaderboard shrinks to fit rather than overflowing the page", () => {
  const measure = helveticaMeasure();
  const section = wideBoard().sections[0];
  const fitted = fitTableFontSizes(measure, section, A4_AVAILABLE, 9, 9);
  assert.ok(fitted.bodySize < 9, "14 columns do not fit A4 portrait at 9pt");
  assert.ok(fitted.bodySize >= 6, "type must stay legible");
});

test("every column has room for its own content once fitted, so nothing breaks mid-token", () => {
  const measure = helveticaMeasure();
  const section = wideBoard().sections[0];
  const fitted = fitTableFontSizes(measure, section, A4_AVAILABLE, 9, 9);
  const columns = layoutColumns(measure, section, A4_AVAILABLE, fitted.headerSize, fitted.bodySize);

  section.headers.forEach((header, index) => {
    const room = columns[index].width - CELL_PADDING * 2;
    assert.ok(
      room >= measure(header, fitted.headerSize),
      `header "${header}" has ${room.toFixed(2)}pt but needs ${measure(header, fitted.headerSize).toFixed(2)}pt`
    );
    for (const row of section.rows) {
      const value = row[index] ?? "";
      assert.ok(
        room >= measure(value, fitted.bodySize),
        `cell "${value}" in column "${header}" has ${room.toFixed(2)}pt but needs ${measure(value, fitted.bodySize).toFixed(2)}pt`
      );
    }
  });
});

test("the fitted table still spans the full page width", () => {
  const measure = helveticaMeasure();
  const section = wideBoard().sections[0];
  const fitted = fitTableFontSizes(measure, section, A4_AVAILABLE, 9, 9);
  const columns = layoutColumns(measure, section, A4_AVAILABLE, fitted.headerSize, fitted.bodySize);
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  assert.ok(Math.abs(total - A4_AVAILABLE) < 0.5, `table spans ${total.toFixed(2)} of ${A4_AVAILABLE}`);
});

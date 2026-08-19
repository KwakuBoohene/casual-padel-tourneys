import type { ExportTable } from "./exportTable.js";

/** Excel on Windows needs the BOM to read UTF-8 player names correctly. */
export const UTF8_BOM = "﻿";

const NEEDS_QUOTING = /[",\r\n]/;
/** Spreadsheets execute leading =, +, -, @ as formulas — neutralise before writing. */
const FORMULA_PREFIX = /^[=+\-@]/;

export function escapeCsvField(value: string): string {
  const guarded = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (!NEEDS_QUOTING.test(guarded)) {
    return guarded;
  }
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** RFC 4180: CRLF line endings, quotes doubled inside quoted fields. */
export function toCsv(table: ExportTable): string {
  const lines = [table.headers, ...table.rows].map((row) =>
    row.map(escapeCsvField).join(",")
  );
  if (table.note) {
    lines.push("");
    lines.push(escapeCsvField(table.note));
  }
  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}

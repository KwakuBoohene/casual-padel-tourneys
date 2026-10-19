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

/**
 * RFC 4180: CRLF line endings, quotes doubled inside quoted fields.
 * Multi-section documents get a blank line and a heading between tables, which spreadsheets
 * read as a second block rather than a broken file.
 */
export function toCsv(document: ExportTable): string {
  const lines: string[] = [];
  document.sections.forEach((section, index) => {
    if (index > 0) {
      lines.push("");
    }
    if (section.heading) {
      lines.push(escapeCsvField(section.heading));
    }
    lines.push(section.headers.map(escapeCsvField).join(","));
    for (const row of section.rows) {
      lines.push(row.map(escapeCsvField).join(","));
    }
    if (section.note) {
      lines.push("");
      lines.push(escapeCsvField(section.note));
    }
  });
  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}

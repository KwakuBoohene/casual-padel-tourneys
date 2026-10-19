import type { ExportSection } from "@padel/shared";

export interface ColumnLayout {
  x: number;
  width: number;
  align: "left" | "right";
}

const MIN_COLUMN_WIDTH = 26;
/** Inset applied on both sides when drawing, so adjacent columns never touch. */
export const CELL_PADDING = 6;
const NUMERIC_CELL = /^[+-]?\d+(\.\d+)?%?$/;

/**
 * A column is numeric when every value in it reads as a figure, so numbers right-align and
 * line up down the page while names and dates stay left. Derived from the data rather than
 * column position, because the leaderboard and per-match tables have different shapes.
 */
function isNumericColumn(table: ExportSection, index: number): boolean {
  const cells = table.rows.map((row) => row[index] ?? "").filter((cell) => cell.length > 0);
  return cells.length > 0 && cells.every((cell) => NUMERIC_CELL.test(cell));
}

/** Never shrink type past the point of legibility; wrapping is the lesser evil below this. */
const MIN_BODY_SIZE = 6;

/**
 * Breathing room beyond the measured text width. pdfkit's own wrap decision does not agree with
 * `widthOfString` to the last fraction of a point, so a column sized to exactly fit its header
 * still breaks — `PL(A)` fitted with 0.76pt to spare and wrapped anyway.
 */
const TEXT_SLACK = 2;

/** Width the table wants before any scaling — the sum of every column's natural width. */
function naturalWidths(
  measure: (text: string, size: number) => number,
  table: ExportSection,
  headerSize: number,
  bodySize: number
): number[] {
  return table.headers.map((header, index) => {
    const widest = table.rows.reduce(
      (max, row) => Math.max(max, measure(row[index] ?? "", bodySize)),
      measure(header, headerSize)
    );
    return Math.max(MIN_COLUMN_WIDTH, widest + CELL_PADDING * 2 + TEXT_SLACK);
  });
}

/**
 * Shrink the type until the table's natural width fits the page.
 *
 * `layoutColumns` scales columns down proportionally to fill the available width, so once a table
 * wants more room than the page has, every column ends up narrower than its own content and cells
 * break mid-token — `PW(A)` renders as `PW(A` above `)`, and `+33` as `+3` above `3`. Sizing the
 * type to the table first keeps each header and figure on one line. Returns the sizes unchanged
 * when the table already fits, so narrow tables keep the default 9pt.
 */
export function fitTableFontSizes(
  measure: (text: string, size: number) => number,
  table: ExportSection,
  available: number,
  headerSize: number,
  bodySize: number
): { headerSize: number; bodySize: number } {
  let header = headerSize;
  let body = bodySize;
  const total = (h: number, b: number): number =>
    naturalWidths(measure, table, h, b).reduce((sum, width) => sum + width, 0);

  while (body > MIN_BODY_SIZE && total(header, body) > available) {
    header -= 0.5;
    body -= 0.5;
  }
  return { headerSize: header, bodySize: body };
}

/**
 * Size columns from their widest content so a long player name never collides with the
 * figures, then scale every column to fill the page. Scaling proportionally keeps the
 * relative widths and avoids both a conspicuous mid-table gap and one ballooned column.
 */
export function layoutColumns(
  measure: (text: string, size: number) => number,
  table: ExportSection,
  available: number,
  headerSize: number,
  bodySize: number
): ColumnLayout[] {
  const numeric = table.headers.map((_, index) => isNumericColumn(table, index));

  const natural = naturalWidths(measure, table, headerSize, bodySize);

  const total = natural.reduce((sum, width) => sum + width, 0);
  const widths = natural.map((width) =>
    Math.max(MIN_COLUMN_WIDTH, (width * available) / total)
  );

  // Clamping to the minimum can push the row past the page; settle the difference across the
  // columns that have room to give.
  const drift = available - widths.reduce((sum, width) => sum + width, 0);
  if (Math.abs(drift) > 0.01) {
    const adjustable = widths
      .map((width, index) => ({ width, index }))
      .filter((entry) => entry.width > MIN_COLUMN_WIDTH);
    const targets =
      adjustable.length > 0 ? adjustable : widths.map((width, index) => ({ width, index }));
    const pool = targets.reduce((sum, entry) => sum + entry.width, 0);
    for (const entry of targets) {
      widths[entry.index] = Math.max(MIN_COLUMN_WIDTH, entry.width + (drift * entry.width) / pool);
    }
  }

  let x = 0;
  return widths.map((width, index) => {
    const layout: ColumnLayout = { x, width, align: numeric[index] ? "right" : "left" };
    x += width;
    return layout;
  });
}

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

  const natural = table.headers.map((header, index) => {
    const widest = table.rows.reduce(
      (max, row) => Math.max(max, measure(row[index] ?? "", bodySize)),
      measure(header, headerSize)
    );
    return Math.max(MIN_COLUMN_WIDTH, widest + CELL_PADDING * 2);
  });

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

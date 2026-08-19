import PDFDocument from "pdfkit";
import type { Readable } from "node:stream";
import type { ExportTable } from "@padel/shared";

import { CELL_PADDING, layoutColumns } from "./pdfTableLayout.js";

const PAGE_MARGIN = 40;
const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 10;
const HEADER_SIZE = 9;
const BODY_SIZE = 9;
const ROW_HEIGHT = 18;

/**
 * Render a table to a PDF stream. Uses the built-in Helvetica faces so no font files ship in
 * the API image, and streams rather than buffering a whole season of rows in memory.
 */
export function renderExportTablePdf(table: ExportTable): Readable {
  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, autoFirstPage: true });
  const available = doc.page.width - PAGE_MARGIN * 2;
  const left = PAGE_MARGIN;
  const bottom = doc.page.height - PAGE_MARGIN;

  const measure = (text: string, size: number): number =>
    doc.fontSize(size).widthOfString(text ?? "");
  const columns = layoutColumns(measure, table, available, HEADER_SIZE, BODY_SIZE);

  doc.font("Helvetica-Bold").fontSize(TITLE_SIZE).text(table.title, left, PAGE_MARGIN);
  if (table.subtitle) {
    doc.font("Helvetica").fontSize(SUBTITLE_SIZE).fillColor("#555555").text(table.subtitle);
    doc.fillColor("#000000");
  }
  doc.moveDown(0.8);

  let y = doc.y;

  const drawHeaderRow = (): void => {
    doc.font("Helvetica-Bold").fontSize(HEADER_SIZE);
    table.headers.forEach((header, index) => {
      const column = columns[index];
      doc.text(header, left + column.x + CELL_PADDING, y, {
        width: Math.max(1, column.width - CELL_PADDING * 2),
        align: column.align,
        lineBreak: false,
        ellipsis: true
      });
    });
    y += ROW_HEIGHT;
    doc
      .moveTo(left, y - 5)
      .lineTo(left + available, y - 5)
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .stroke();
    doc.font("Helvetica").fontSize(BODY_SIZE);
  };

  drawHeaderRow();

  for (const row of table.rows) {
    if (y + ROW_HEIGHT > bottom) {
      doc.addPage();
      y = PAGE_MARGIN;
      drawHeaderRow();
    }
    row.forEach((cell, index) => {
      const column = columns[index];
      doc.text(cell ?? "", left + column.x + CELL_PADDING, y, {
        width: Math.max(1, column.width - CELL_PADDING * 2),
        align: column.align,
        lineBreak: false,
        ellipsis: true
      });
    });
    y += ROW_HEIGHT;
  }

  if (table.note) {
    if (y + ROW_HEIGHT * 2 > bottom) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    doc
      .font("Helvetica-Oblique")
      .fontSize(SUBTITLE_SIZE)
      .fillColor("#555555")
      .text(table.note, left, y + ROW_HEIGHT, { width: available });
  }

  doc.end();
  return doc as unknown as Readable;
}

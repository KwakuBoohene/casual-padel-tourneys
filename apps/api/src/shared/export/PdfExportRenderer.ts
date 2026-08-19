import PDFDocument from "pdfkit";
import type { Readable } from "node:stream";
import type { ExportSection, ExportTable } from "@padel/shared";

import { CELL_PADDING, layoutColumns } from "./pdfTableLayout.js";

const PAGE_MARGIN = 40;
const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 10;
const HEADING_SIZE = 12;
const HEADER_SIZE = 9;
const BODY_SIZE = 9;
const ROW_HEIGHT = 18;

/**
 * Render an export document to a PDF stream. Uses the built-in Helvetica faces so no font files
 * ship in the API image, and streams rather than buffering a whole season of rows in memory.
 */
export function renderExportTablePdf(document: ExportTable): Readable {
  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, autoFirstPage: true });
  const available = doc.page.width - PAGE_MARGIN * 2;
  const left = PAGE_MARGIN;
  const bottom = doc.page.height - PAGE_MARGIN;
  const measure = (text: string, size: number): number =>
    doc.fontSize(size).widthOfString(text ?? "");

  doc.font("Helvetica-Bold").fontSize(TITLE_SIZE).text(document.title, left, PAGE_MARGIN);
  if (document.subtitle) {
    doc.font("Helvetica").fontSize(SUBTITLE_SIZE).fillColor("#555555").text(document.subtitle);
    doc.fillColor("#000000");
  }
  doc.moveDown(0.8);

  let y = doc.y;
  const showHeadings = document.sections.length > 1;

  for (const section of document.sections) {
    y = drawSection(doc, section, { left, available, bottom, y, measure, showHeadings });
  }

  doc.end();
  return doc as unknown as Readable;
}

interface SectionContext {
  left: number;
  available: number;
  bottom: number;
  y: number;
  measure: (text: string, size: number) => number;
  showHeadings: boolean;
}

function drawSection(
  doc: PDFKit.PDFDocument,
  section: ExportSection,
  ctx: SectionContext
): number {
  const { left, available, bottom, measure } = ctx;
  const columns = layoutColumns(measure, section, available, HEADER_SIZE, BODY_SIZE);
  let y = ctx.y;

  const cell = (text: string, x: number, width: number, align: "left" | "right"): void => {
    doc.text(text ?? "", left + x + CELL_PADDING, y, {
      width: Math.max(1, width - CELL_PADDING * 2),
      align,
      lineBreak: false,
      ellipsis: true
    });
  };

  const drawHeaderRow = (): void => {
    doc.font("Helvetica-Bold").fontSize(HEADER_SIZE);
    section.headers.forEach((header, index) => {
      cell(header, columns[index].x, columns[index].width, columns[index].align);
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

  if (ctx.showHeadings && section.heading) {
    if (y + ROW_HEIGHT * 3 > bottom) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    doc.font("Helvetica-Bold").fontSize(HEADING_SIZE).text(section.heading, left, y);
    y += ROW_HEIGHT + 4;
  }

  drawHeaderRow();

  for (const row of section.rows) {
    if (y + ROW_HEIGHT > bottom) {
      doc.addPage();
      y = PAGE_MARGIN;
      drawHeaderRow();
    }
    row.forEach((value, index) => {
      cell(value, columns[index].x, columns[index].width, columns[index].align);
    });
    y += ROW_HEIGHT;
  }

  if (section.note) {
    if (y + ROW_HEIGHT * 2 > bottom) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    doc
      .font("Helvetica-Oblique")
      .fontSize(SUBTITLE_SIZE)
      .fillColor("#555555")
      .text(section.note, left, y + ROW_HEIGHT / 2, { width: available });
    doc.fillColor("#000000");
    y = doc.y;
  }

  return y + ROW_HEIGHT;
}

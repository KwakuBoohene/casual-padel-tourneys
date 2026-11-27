import PDFDocument from "pdfkit";
import type { Readable } from "node:stream";
import type { MatchScheduleDocument } from "@padel/shared";

import {
  CONTENT_WIDTH,
  FOOTER_HEIGHT,
  FIRST_HEADER_HEIGHT,
  PAGE,
  SECTION_GAP,
  layoutSchedule,
  roundRangeLabel,
  type SchedulePage
} from "./matchScheduleLayout.js";
import { INK, REST_FONT_SIZE, drawRound, fitLine, restText, restTextWidth } from "./matchSchedulePdfRound.js";

type Doc = PDFKit.PDFDocument;
const LEFT = PAGE.margin;
const RIGHT = PAGE.margin + CONTENT_WIDTH;
const INSTRUCTION = "Write each team's score in the boxes and hand the sheet to the organiser after each round.";

function drawFirstHeader(doc: Doc, schedule: MatchScheduleDocument): void {
  const top = PAGE.margin;
  doc.circle(LEFT + 4, top + 4.5, 4).fill(INK.accent);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(INK.muted)
    .text("CASUAL PADEL  ·  MATCH SCHEDULE", LEFT + 14, top + 1, { characterSpacing: 0.85, lineBreak: false });
  doc.font("Helvetica").fontSize(9)
    .text(schedule.dateLabel, LEFT, top + 1, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
  doc.fillColor(INK.ink);
  fitLine(doc, "Helvetica-Bold", schedule.title, { x: LEFT, y: top + 24, width: CONTENT_WIDTH, size: 26, minSize: 18 });

  let x = LEFT;
  const factsTop = top + 67;
  for (const fact of schedule.facts) {
    const label = fact.label.toUpperCase();
    const labelWidth = doc.font("Helvetica-Bold").fontSize(7).widthOfString(label, { characterSpacing: 0.56 });
    const valueWidth = doc.font("Helvetica-Bold").fontSize(10.5).widthOfString(fact.value);
    const width = Math.max(labelWidth, valueWidth) + 20;
    if (x + width > RIGHT) break;
    doc.roundedRect(x, factsTop, width, 38, 6).lineWidth(1).stroke(INK.rule);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(INK.muted)
      .text(label, x + 10, factsTop + 8, { characterSpacing: 0.56, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK.ink).text(fact.value, x + 10, factsTop + 20, { lineBreak: false });
    x += width + 8;
  }
  doc.font("Helvetica").fontSize(8.5).fillColor(INK.muted).text(INSTRUCTION, LEFT, top + 117, { width: CONTENT_WIDTH });
  doc.rect(LEFT, top + FIRST_HEADER_HEIGHT - 2, CONTENT_WIDTH, 2).fill(INK.ink);
}

function drawRunningHeader(doc: Doc, schedule: MatchScheduleDocument, page: SchedulePage): void {
  const first = schedule.rounds[page.rounds[0].index].roundNumber;
  const last = schedule.rounds[page.rounds[page.rounds.length - 1].index].roundNumber;
  const right = [schedule.shortDateLabel, roundRangeLabel(first, last)].filter(Boolean).join("  ·  ");
  doc.font("Helvetica").fontSize(9).fillColor(INK.muted)
    .text(right, LEFT, PAGE.margin + 2, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
  const rightWidth = doc.widthOfString(right);
  doc.fillColor(INK.ink);
  fitLine(doc, "Helvetica-Bold", schedule.title, { x: LEFT, y: PAGE.margin, width: CONTENT_WIDTH - rightWidth - 16, size: 11 });
  doc.moveTo(LEFT, PAGE.margin + 24.5).lineTo(RIGHT, PAGE.margin + 24.5).lineWidth(1).strokeColor(INK.rule).stroke();
}

function drawFooter(doc: Doc, pageNumber: number, pageCount: number): void {
  const y = PAGE.height - PAGE.margin - FOOTER_HEIGHT;
  doc.font("Helvetica").fontSize(8).fillColor(INK.muted).text("Casual Padel", LEFT, y, { lineBreak: false });
  doc.text(`Page ${pageNumber} of ${pageCount}`, LEFT, y, { width: CONTENT_WIDTH, align: "right", lineBreak: false });
}

/**
 * Printable round-by-round matchups on A4. Built-in Helvetica keeps font files out of the API
 * image. Pages are planned up front by {@link layoutSchedule}, so "Page X of Y" needs no buffering.
 */
export function renderMatchSchedulePdf(schedule: MatchScheduleDocument): Readable {
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true, info: { Title: schedule.title } });
  const restWidth = restTextWidth(doc);
  const restHeights = schedule.rounds.map((round) =>
    round.sittingOut.length
      ? doc.font("Helvetica").fontSize(REST_FONT_SIZE).heightOfString(restText(round), { width: restWidth })
      : 0
  );
  const pages = layoutSchedule(
    schedule.rounds.map((round, i) => ({ courtCount: round.courts.length, restTextHeight: restHeights[i] }))
  );

  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) doc.addPage({ size: "A4", margin: 0 });
    if (pageIndex === 0) drawFirstHeader(doc, schedule);
    else drawRunningHeader(doc, schedule, page);
    for (const placed of page.rounds) {
      drawRound(doc, schedule.rounds[placed.index], {
        y: placed.y,
        totalRounds: schedule.rounds.length,
        target: schedule.matchTarget,
        restTextHeight: restHeights[placed.index]
      });
    }
    drawFooter(doc, pageIndex + 1, pages.length);
  });

  if (schedule.rounds.length === 0) {
    doc.font("Helvetica").fontSize(11).fillColor(INK.muted)
      .text("No rounds scheduled yet.", LEFT, PAGE.margin + FIRST_HEADER_HEIGHT + SECTION_GAP);
  }

  doc.end();
  return doc as unknown as Readable;
}

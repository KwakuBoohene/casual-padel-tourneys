import type { MatchScheduleCourt, MatchScheduleRound } from "@padel/shared";

import {
  CARD_COLUMN_GAP,
  CARD_HEIGHT,
  CARD_ROW_GAP,
  CARD_WIDTH,
  CARDS_PER_ROW,
  CONTENT_WIDTH,
  PAGE,
  REST_PADDING_Y,
  ROUND_HEADING_HEIGHT,
  ROUND_INNER_GAP,
  cardRows
} from "./matchScheduleLayout.js";
import { fitText } from "./fitText.js";

/** Print palette — light ink, still legible in greyscale. Matches the `Padel / Print` variables. */
export const INK = {
  paper: "#FFFFFF",
  surface: "#F8FAFC",
  ink: "#0F172A",
  muted: "#64748B",
  rule: "#CBD5E1",
  accent: "#84CC16",
  accentTint: "#ECFCCB"
} as const;

export const REST_LABEL = "SITTING OUT";
export const REST_FONT_SIZE = 9.5;
const REST_LABEL_SIZE = 8;
const CARD_PAD = 12;
const BOX = { width: 34, height: 30, gap: 5, dash: 6 } as const;
const SCORE_WIDTH = BOX.width * 2 + BOX.gap * 2 + BOX.dash;
const TEAM_WIDTH = (CARD_WIDTH - CARD_PAD * 2 - SCORE_WIDTH - 16) / 2;

type Doc = PDFKit.PDFDocument;

/** One unwrapped line, shrunk then ellipsised to fit `width`. */
export function fitLine(
  doc: Doc,
  font: string,
  text: string,
  box: { x: number; y: number; width: number; size: number; minSize?: number; align?: "left" | "right" | "center" }
): void {
  doc.font(font);
  const fitted = fitText((t, s) => doc.fontSize(s).widthOfString(t), text, box.width, box.size, box.minSize);
  doc.fontSize(fitted.size).text(fitted.text, box.x, box.y + (box.size - fitted.size) / 2, {
    width: box.width,
    align: box.align ?? "left",
    lineBreak: false
  });
}

/** Width the sitting-out names wrap within, after the inline label. */
export function restTextWidth(doc: Doc): number {
  const label = doc.font("Helvetica-Bold").fontSize(REST_LABEL_SIZE).widthOfString(REST_LABEL, { characterSpacing: 0.64 });
  return CONTENT_WIDTH - 20 - label - 8;
}

export const restText = (round: MatchScheduleRound): string => round.sittingOut.join("  ·  ");

function drawScore(doc: Doc, court: MatchScheduleCourt, x: number, y: number): void {
  const result = court.result;
  if (result.kind === "text") {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK.ink)
      .text(result.value, x, y + 10, { width: SCORE_WIDTH, align: "center", height: BOX.height, ellipsis: true });
    return;
  }
  const boxes = [x, x + BOX.width + BOX.gap * 2 + BOX.dash];
  const values = result.kind === "points" ? [result.a, result.b] : ["", ""];
  boxes.forEach((bx, i) => {
    doc.roundedRect(bx, y, BOX.width, BOX.height, 4).lineWidth(1.25).fillAndStroke(INK.paper, INK.ink);
    if (values[i]) {
      doc.font("Helvetica-Bold").fontSize(14).fillColor(INK.ink)
        .text(values[i], bx, y + 8, { width: BOX.width, align: "center", lineBreak: false });
    }
  });
  const dashX = x + BOX.width + BOX.gap;
  doc.moveTo(dashX, y + BOX.height / 2).lineTo(dashX + BOX.dash, y + BOX.height / 2)
    .lineWidth(1).strokeColor(INK.muted).stroke();
}

function drawTeam(doc: Doc, names: [string, string], x: number, y: number, align: "left" | "right"): void {
  doc.fillColor(INK.ink);
  names.forEach((name, i) => {
    fitLine(doc, "Helvetica-Bold", name, { x, y: y + i * 16, width: TEAM_WIDTH, size: 12, minSize: 10, align });
  });
}

function drawCard(doc: Doc, court: MatchScheduleCourt, target: string, x: number, y: number): void {
  doc.roundedRect(x, y, CARD_WIDTH, CARD_HEIGHT, 8).lineWidth(1).fillAndStroke(INK.paper, INK.rule);
  doc.font("Helvetica-Bold").fontSize(9);
  const pillWidth = doc.widthOfString(court.label, { characterSpacing: 0.72 }) + 16;
  doc.roundedRect(x + CARD_PAD, y + 10, pillWidth, 17, 4).fill(INK.accentTint);
  doc.fillColor(INK.ink).text(court.label, x + CARD_PAD + 8, y + 14.5, { characterSpacing: 0.72, lineBreak: false });
  doc.fillColor(INK.muted);
  fitLine(doc, "Helvetica", target, {
    x: x + CARD_PAD + pillWidth + 6, y: y + 14.5, width: CARD_WIDTH - CARD_PAD * 2 - pillWidth - 6, size: 9, align: "right"
  });
  const bodyY = y + 42;
  drawTeam(doc, court.teamA, x + CARD_PAD, bodyY, "left");
  drawScore(doc, court, x + (CARD_WIDTH - SCORE_WIDTH) / 2, bodyY);
  drawTeam(doc, court.teamB, x + CARD_WIDTH - CARD_PAD - TEAM_WIDTH, bodyY, "right");
}

function drawHeading(doc: Doc, round: MatchScheduleRound, total: number, y: number): void {
  const left = PAGE.margin;
  const right = left + CONTENT_WIDTH;
  const heading = `Round ${round.roundNumber}`;
  const counter = `${round.roundNumber} of ${total}`;
  doc.font("Helvetica-Bold").fontSize(15).fillColor(INK.ink).text(heading, left, y, { lineBreak: false });
  const headingEnd = left + doc.widthOfString(heading) + 8;
  doc.font("Helvetica").fontSize(9);
  const counterStart = right - doc.widthOfString(counter);
  doc.fillColor(INK.muted).text(counter, counterStart, y + 4, { lineBreak: false });
  doc.moveTo(headingEnd, y + 9).lineTo(counterStart - 8, y + 9).lineWidth(1).strokeColor(INK.rule).stroke();
}

function drawRest(doc: Doc, round: MatchScheduleRound, y: number, textHeight: number): void {
  const left = PAGE.margin;
  doc.roundedRect(left, y, CONTENT_WIDTH, textHeight + REST_PADDING_Y * 2, 6).fill(INK.surface);
  doc.font("Helvetica-Bold").fontSize(REST_LABEL_SIZE).fillColor(INK.muted)
    .text(REST_LABEL, left + 10, y + REST_PADDING_Y + 1.5, { characterSpacing: 0.64, lineBreak: false });
  const width = restTextWidth(doc);
  doc.font("Helvetica").fontSize(REST_FONT_SIZE).fillColor(INK.ink)
    .text(restText(round), left + CONTENT_WIDTH - 10 - width, y + REST_PADDING_Y, { width });
}

/** One round: heading, court cards (two per row) and the sitting-out strip. */
export function drawRound(
  doc: Doc,
  round: MatchScheduleRound,
  ctx: { y: number; totalRounds: number; target: string; restTextHeight: number }
): void {
  drawHeading(doc, round, ctx.totalRounds, ctx.y);
  const cardsTop = ctx.y + ROUND_HEADING_HEIGHT + ROUND_INNER_GAP;
  round.courts.forEach((court, i) => {
    const column = i % CARDS_PER_ROW;
    const row = Math.floor(i / CARDS_PER_ROW);
    const x = PAGE.margin + column * (CARD_WIDTH + CARD_COLUMN_GAP);
    drawCard(doc, court, ctx.target, x, cardsTop + row * (CARD_HEIGHT + CARD_ROW_GAP));
  });
  if (ctx.restTextHeight > 0) {
    const rows = cardRows(round.courts.length);
    const restTop = cardsTop + rows * CARD_HEIGHT + (rows - 1) * CARD_ROW_GAP + ROUND_INNER_GAP;
    drawRest(doc, round, restTop, ctx.restTextHeight);
  }
}

/**
 * Pure geometry for the printable match schedule (A4, points). Mirrors the approved Figma design
 * (`EXPORT 01 — Printable matchups`). The renderer draws; this decides where things go.
 */
export const PAGE = { width: 595.28, height: 841.89, margin: 36 } as const;
export const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;

export const FIRST_HEADER_HEIGHT = 141;
export const RUNNING_HEADER_HEIGHT = 25;
export const SECTION_GAP = 18;
export const FOOTER_HEIGHT = 10;

export const ROUND_HEADING_HEIGHT = 18;
export const ROUND_INNER_GAP = 8;
export const CARD_HEIGHT = 85;
export const CARD_ROW_GAP = 10;
export const CARD_COLUMN_GAP = 13;
export const CARDS_PER_ROW = 2;
export const CARD_WIDTH = (CONTENT_WIDTH - CARD_COLUMN_GAP * (CARDS_PER_ROW - 1)) / CARDS_PER_ROW;
export const REST_PADDING_Y = 6;

export interface RoundMeasure {
  courtCount: number;
  /** Height of the wrapped sitting-out names; 0 when nobody rests (strip omitted). */
  restTextHeight: number;
}

export interface PlacedRound {
  index: number;
  y: number;
  height: number;
}

export interface SchedulePage {
  rounds: PlacedRound[];
}

export function cardRows(courtCount: number): number {
  return Math.max(1, Math.ceil(courtCount / CARDS_PER_ROW));
}

export function restStripHeight(restTextHeight: number): number {
  return restTextHeight > 0 ? restTextHeight + REST_PADDING_Y * 2 : 0;
}

export function roundHeight(round: RoundMeasure): number {
  const rows = cardRows(round.courtCount);
  const cards = rows * CARD_HEIGHT + (rows - 1) * CARD_ROW_GAP;
  const rest = restStripHeight(round.restTextHeight);
  return ROUND_HEADING_HEIGHT + ROUND_INNER_GAP + cards + (rest ? ROUND_INNER_GAP + rest : 0);
}

function contentTop(pageIndex: number): number {
  const header = pageIndex === 0 ? FIRST_HEADER_HEIGHT : RUNNING_HEADER_HEIGHT;
  return PAGE.margin + header + SECTION_GAP;
}

const CONTENT_BOTTOM = PAGE.height - PAGE.margin - FOOTER_HEIGHT - SECTION_GAP;

/**
 * Greedy page fill. A round is never split: if it does not fit below the previous one it starts
 * the next page. A round taller than a whole page still gets its own page rather than vanishing.
 */
export function layoutSchedule(rounds: RoundMeasure[]): SchedulePage[] {
  const pages: SchedulePage[] = [{ rounds: [] }];
  let y = contentTop(0);
  rounds.forEach((round, index) => {
    const height = roundHeight(round);
    const page = pages[pages.length - 1];
    if (page.rounds.length > 0 && y + height > CONTENT_BOTTOM) {
      pages.push({ rounds: [] });
      y = contentTop(pages.length - 1);
    }
    pages[pages.length - 1].rounds.push({ index, y, height });
    y += height + SECTION_GAP;
  });
  return pages;
}

/** "Rounds 4–7" for the running header; a single round reads "Round 8". */
export function roundRangeLabel(first: number, last: number): string {
  return first === last ? `Round ${first}` : `Rounds ${first}–${last}`;
}

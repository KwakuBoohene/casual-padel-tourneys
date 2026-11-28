/**
 * Format-neutral model of the printable match schedule. The API builds it from tournament state
 * and the PDF renderer draws it; neither needs to know about the other.
 */
export interface MatchScheduleFact {
  label: string;
  value: string;
}

export type MatchScheduleResult =
  | { kind: "blank" }
  | { kind: "points"; a: string; b: string }
  | { kind: "text"; value: string };

export interface MatchScheduleCourt {
  /** Display label, e.g. "COURT 1". */
  label: string;
  teamA: [string, string];
  teamB: [string, string];
  /** Blank boxes until a score exists, so the sheet doubles as a score card. */
  result: MatchScheduleResult;
}

export interface MatchScheduleRound {
  roundNumber: number;
  courts: MatchScheduleCourt[];
  /** Players not on court this round, in roster order. Empty when nobody rests. */
  sittingOut: string[];
}

export interface MatchScheduleDocument {
  title: string;
  /** Human date for the header, e.g. "Friday, 27 November 2026". */
  dateLabel: string;
  /** Shorter form for running headers, e.g. "27 Nov 2026". */
  shortDateLabel: string;
  facts: MatchScheduleFact[];
  /** What a match is played to, printed on every card, e.g. "First to 24". */
  matchTarget: string;
  rounds: MatchScheduleRound[];
}

/** Pure KOH court state — no Prisma / HTTP. */

export interface KohEngineUnit {
  id: string;
  /** Display only — engine never pairs by name. */
  playerAId: string;
  playerBId: string;
  matchesWon: number;
  matchesLost: number;
  /** Consecutive wins while holding king (reset on loss / demotion). */
  kingWinStreak: number;
  /**
   * Tie-break for “weakest”: golden + star losses (more → weaker / ranks higher in rankings).
   * Optional until score API fills it; defaults to 0.
   */
  specialLosses?: number;
}

export interface KohEngineCourt {
  id: string;
  courtNumber: number;
  /** queue[0] = king, queue[1] = challenger, queue.slice(2) = FIFO waiting. */
  queue: KohEngineUnit[];
}

export interface KohEnginePromotionRule {
  courtNumber: number;
  winsRequired: number;
  promoteToCourtNumber?: number;
}

export type KohMatchResultEvent =
  | {
      type: "KING_WIN";
      courtId: string;
      winnerUnitId: string;
      loserUnitId: string;
    }
  | {
      type: "KING_LOSS";
      courtId: string;
      winnerUnitId: string;
      loserUnitId: string;
    };

export type KohPromotionNotify =
  | {
      type: "PROMOTED";
      fromCourtNumber: number;
      toCourtNumber: number;
      promotedUnitId: string;
      demotedUnitId: string;
    }
  | {
      type: "NEEDS_ORGANIZER_PICK";
      fromCourtNumber: number;
      toCourtNumber: number;
      promotedUnitId: string;
      candidateUnitIds: string[];
    };

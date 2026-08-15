export type TournamentMode = "AMERICANO" | "MEXICANO" | "KING_OF_THE_HILL";
export type TournamentVariant = "CLASSIC" | "MIXED" | "TEAM";
export type SchedulingMode = "TARGET_GAMES" | "TOTAL_TIME" | "ROUND_ROBIN";
export type PlayerGender = "MALE" | "FEMALE";
/** How match outcomes are recorded. Missing on old payloads ⇒ Americano points. */
export type ScoringMode = "AMERICANO_POINTS" | "REGULAR";
export type RegularSetFormat = "BO3_GAMES" | "BO5_GAMES" | "FULL_SET";
export type GameWinBy = 1 | 2;
export type TiebreakPoints = 7 | 10;

/** KOH pairing strategy. ROUND_ROBIN_PAIRS reserved for the next epic. */
export type KohPairingMode = "WINNER_STAYS" | "ROUND_ROBIN_PAIRS";

/**
 * How a single KOH game was won (per game, not per match).
 * Used by live score API later — defined here for shared contracts.
 */
export type KohGameWinMethod = "REGULAR" | "GOLDEN" | "STAR";


export interface TournamentPlayerInput {
  name: string;
  gender?: PlayerGender;
}

export interface Player {
  id: string;
  name: string;
  gender?: PlayerGender;
  gamesPlayed: number;
  totalPoints: number;
  handicap?: number;
  integrationWave?: number;
  /** Regular standings — omitted / 0 for Americano points tournaments. */
  matchesWon?: number;
  matchesLost?: number;
  setsWon?: number;
  setsLost?: number;
  gamesWon?: number;
  gamesLost?: number;
}

export interface PendingPlayer {
  id: string;
  name: string;
  gender?: PlayerGender;
  createdAt: string;
}

/** One set line for Regular scoring (games counts; optional set tiebreak points). */
export interface MatchSet {
  setNumber: number;
  gamesA: number;
  gamesB: number;
  tbA?: number;
  tbB?: number;
}

export interface Match {
  id: string;
  round: number;
  court: number;
  teamA: [string, string];
  teamB: [string, string];
  scoreA?: number;
  scoreB?: number;
  completed: boolean;
  /** Regular scoring set lines (draft or complete). */
  sets?: MatchSet[];
  /** Match tiebreak points when sets are even and match TB is enabled. */
  matchTbA?: number;
  matchTbB?: number;
}

export interface Round {
  id: string;
  roundNumber: number;
  matches: Match[];
  isLocked: boolean;
}

/** Regular (games/sets) rules — never named “tennis” in code or UI. */
export interface RegularScoringConfig {
  setFormat: RegularSetFormat;
  gameWinBy: GameWinBy;
  setsToWin: number;
  /** Set tiebreak target when full set + win-by-2 (typically 7 or 10). */
  setTiebreakTo?: TiebreakPoints;
  /** Match tiebreak when sets are even / deciding set rules need it. */
  matchTiebreak?: boolean;
}

export interface TournamentConfig {
  name: string;
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  players: TournamentPlayerInput[];
  courts: number;
  /** Required for Americano points; unused for Regular standings. */
  pointsPerMatch: number;
  /** Omit or AMERICANO_POINTS for legacy tournaments. */
  scoringMode?: ScoringMode;
  regularScoring?: RegularScoringConfig;
  targetGamesPerPlayer?: number;
  tournamentTimeMinutes?: number;
  enableAutoIntegration?: boolean;
  integrationThreshold?: number;
}

export interface Tournament {
  id: string;
  config: TournamentConfig;
  players: Player[];
  rounds: Round[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  totalPoints: number;
  gamesPlayed: number;
  rank: number;
  /** Regular standings (optional until award path fills them). */
  matchesWon?: number;
  matchesLost?: number;
  setsWon?: number;
  setsLost?: number;
  gamesWon?: number;
  gamesLost?: number;
}

/** Doubles-only KOH pair (no singles unit type). */
export interface KohUnit {
  id: string;
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
}

/**
 * Per-court promotion into a stronger (lower-number) court.
 * Required when the tournament has 2+ courts; omitted for single-court KOH.
 */
export interface KohPromotionRule {
  /** Court that can promote (Court 1 is top — never promotes upward). */
  courtNumber: number;
  /** Match wins as king required before promoting. */
  winsRequired: number;
  /** Destination court; defaults to courtNumber - 1 when omitted. */
  promoteToCourtNumber?: number;
}

/** Active temporary king/challenger swap (restored after next COMPLETE when still in slot). */
export interface KohTempSwap {
  slot: "KING" | "CHALLENGER";
  inUnitId: string;
  outUnitId: string;
  reason: string;
}

/** Live court hub shape: king vs challenger, then FIFO waiting list. */
export interface KohCourt {
  id: string;
  /** 1 = strongest / top of the ladder. */
  courtNumber: number;
  king: KohUnit | null;
  challenger: KohUnit | null;
  /** FIFO queue after the on-court challenger. */
  waiting: KohUnit[];
  tempSwap?: KohTempSwap | null;
}

/** Pending promotion when multiple weakest candidates share the same rank. */
export interface KohPendingPromote {
  fromCourtNumber: number;
  toCourtNumber: number;
  promotedUnitId: string;
  candidateUnitIds: string[];
}

/** Court ladder change after auto-promo or organizer pick. */
export type KohCourtChange =
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

export interface KohTournamentConfig {
  name: string;
  mode: "KING_OF_THE_HILL";
  pairingMode: KohPairingMode;
  courts: number;
  regularScoring: RegularScoringConfig;
  /** Present when courts ≥ 2; one rule per promote-capable court (typically 2..N). */
  promotionRules?: KohPromotionRule[];
}


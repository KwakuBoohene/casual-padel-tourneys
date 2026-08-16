/**
 * Tournament format.
 * - AMERICANO: fairness / partner-rotation pre-schedule (`TARGET_GAMES`, etc.).
 * - MEXICANO: result-driven ladder (round 1 lottery, then 1+3 vs 2+4 from the table).
 *   Does **not** use Americano target-games rotation semantics.
 * - KING_OF_THE_HILL: winner-stays courts (separate engine).
 */
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

/** Create-time fixed doubles pair (Team Mexicano / Team Americano). */
export interface FixedTeamInput {
  playerA: TournamentPlayerInput;
  playerB: TournamentPlayerInput;
  /** Optional display label; defaults to "A / B" names in UI. */
  name?: string;
}

/** Persisted fixed pair — both players share this unit for Team Mexicano / Team Americano. */
export interface FixedPair {
  id: string;
  playerAId: string;
  playerBId: string;
  name?: string;
}

export interface Player {
  id: string;
  name: string;
  gender?: PlayerGender;
  gamesPlayed: number;
  totalPoints: number;
  handicap?: number;
  integrationWave?: number;
  /** Shared by both partners in Team Mexicano / Team Americano (`FixedPair.id`). */
  pairId?: string;
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

/**
 * Regular (games/sets) rules — never named “tennis” in code or UI.
 * Match length presets: see `REGULAR_MATCH_LENGTH_PRESETS` / `docs/regular-scoring.md`.
 */
export interface RegularScoringConfig {
  setFormat: RegularSetFormat;
  gameWinBy: GameWinBy;
  /** First to this many sets wins; max 4 (best of 7). */
  setsToWin: number;
  /** Set tiebreak target when full set + win-by-2 (typically 7 or 10). */
  setTiebreakTo?: TiebreakPoints;
  /** When true with `setsToWin: 2`, play sets to 1–1 then a match tiebreak. */
  matchTiebreak?: boolean;
}

export interface TournamentConfig {
  name: string;
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  players: TournamentPlayerInput[];
  /** Team Mexicano / Team Americano: fixed pairs (also flattened into `players`). */
  teams?: FixedTeamInput[];
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
  /** When true (default), scored matches credit organizer career leaderboard. */
  contributeToCareerLeaderboard?: boolean;
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
  /** Present on live hub for edit/rankings chrome. */
  matchesWon?: number;
  matchesLost?: number;
}

/** One row on the KOH rankings board (doubles unit). */
export interface KohRankingRow {
  rank: number;
  unitId: string;
  courtNumber: number;
  playerAName: string;
  playerBName: string;
  matchesWon: number;
  matchesLost: number;
  /** gamesWon − gamesLost */
  gameDiff: number;
  specialLosses: number;
  /** Bottom of This court when promotion is enabled. */
  weakest?: boolean;
}

export interface KohRankingsBoard {
  tournamentId: string;
  version: number;
  promotionEnabled: boolean;
  /** Court filter used for this payload; null = all courts. */
  courtNumber: number | null;
  rows: KohRankingRow[];
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

/** Summary of the last completed match on a court (viewer + hub). */
export interface KohLastResult {
  gamesA: number;
  gamesB: number;
  /** True when any game was won via GOLDEN or STAR. */
  hadSpecialFinish: boolean;
  specialLabel?: "Golden" | "Star";
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
  lastResult?: KohLastResult | null;
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


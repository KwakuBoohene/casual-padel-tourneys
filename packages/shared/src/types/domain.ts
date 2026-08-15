export type TournamentMode = "AMERICANO" | "MEXICANO";
export type TournamentVariant = "CLASSIC" | "MIXED" | "TEAM";
export type SchedulingMode = "TARGET_GAMES" | "TOTAL_TIME" | "ROUND_ROBIN";
export type PlayerGender = "MALE" | "FEMALE";
/** How match outcomes are recorded. Missing on old payloads ⇒ Americano points. */
export type ScoringMode = "AMERICANO_POINTS" | "REGULAR";
export type RegularSetFormat = "BO3_GAMES" | "BO5_GAMES" | "FULL_SET";
export type GameWinBy = 1 | 2;
export type TiebreakPoints = 7 | 10;

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
}

export interface PendingPlayer {
  id: string;
  name: string;
  gender?: PlayerGender;
  createdAt: string;
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

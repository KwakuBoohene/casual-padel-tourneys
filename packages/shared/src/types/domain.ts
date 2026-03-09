export type TournamentMode = "AMERICANO" | "MEXICANO";
export type TournamentVariant = "CLASSIC" | "MIXED" | "TEAM";
export type SchedulingMode = "TARGET_GAMES" | "TOTAL_TIME" | "ROUND_ROBIN";
export type PlayerGender = "MALE" | "FEMALE";

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

export interface TournamentConfig {
  name: string;
  mode: TournamentMode;
  variant: TournamentVariant;
  schedulingMode: SchedulingMode;
  players: TournamentPlayerInput[];
  courts: number;
  pointsPerMatch: number;
  targetGamesPerPlayer?: number;
  tournamentTimeMinutes?: number;
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
}

export type TournamentMode = "AMERICANO" | "MEXICANO";
export type TournamentVariant = "CLASSIC" | "MIXED" | "TEAM";

export interface Player {
  id: string;
  name: string;
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
  players: string[];
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

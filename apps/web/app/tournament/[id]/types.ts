import type { MatchSet, RegularScoringConfig, ScoringMode, TournamentMode, TournamentVariant } from "@padel/shared";

export type TournamentViewModel = {
  id: string;
  publicToken?: string;
  updatedAt: string;
  config: {
    name: string;
    mode: TournamentMode | string;
    variant: TournamentVariant | string;
    scoringMode?: ScoringMode;
    regularScoring?: RegularScoringConfig;
    pointsPerMatch?: number;
  };
  players: Array<{
    id: string;
    name: string;
    matchesWon?: number;
    matchesLost?: number;
    setsWon?: number;
    gamesWon?: number;
    totalPoints?: number;
  }>;
  leaderboard: Array<{
    playerId: string;
    name: string;
    totalPoints: number;
    gamesPlayed: number;
    rank: number;
    matchesWon?: number;
    matchesLost?: number;
    setsWon?: number;
    gamesWon?: number;
  }>;
  rounds: Array<{
    id: string;
    roundNumber: number;
    matches: Array<{
      id: string;
      court: number;
      teamA: [string, string];
      teamB: [string, string];
      scoreA?: number;
      scoreB?: number;
      completed?: boolean;
      sets?: MatchSet[];
      matchTbA?: number;
      matchTbB?: number;
    }>;
  }>;
};

export function isRegularScoring(scoringMode?: ScoringMode): boolean {
  return scoringMode === "REGULAR";
}

export function formatScoringLabel(mode: string, scoringMode?: ScoringMode): string {
  if (scoringMode === "REGULAR") {
    return "Regular scoring";
  }
  if (mode === "MEXICANO") return "Mexicano scoring";
  if (mode === "AMERICANO") return "Americano scoring";
  return `${mode} scoring`;
}

export function isMatchComplete(match: TournamentViewModel["rounds"][number]["matches"][number]): boolean {
  if (match.completed === true) return true;
  if (match.completed === false) return false;
  return match.scoreA !== undefined && match.scoreB !== undefined;
}

export function matchHasProgress(match: TournamentViewModel["rounds"][number]["matches"][number]): boolean {
  if (isMatchComplete(match)) return true;
  if (match.scoreA !== undefined || match.scoreB !== undefined) return true;
  return Boolean(
    match.sets?.some(
      (set) => set.gamesA > 0 || set.gamesB > 0 || set.tbA !== undefined || set.tbB !== undefined
    )
  );
}

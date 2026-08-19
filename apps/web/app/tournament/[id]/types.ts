import type { MatchSet, RegularScoringConfig, ScoringMode, TournamentMode, TournamentVariant } from "@padel/shared";

export type TournamentViewModel = {
  id: string;
  publicToken?: string;
  updatedAt: string;
  /** Present when organizer ended KOH / Mexicano night. */
  endedAt?: string | null;
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
    gamesLost?: number;
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
      /** Set when the organizer closed the event with this match unplayed. */
      voidedAt?: string | null;
      sets?: MatchSet[];
      matchTbA?: number;
      matchTbB?: number;
    }>;
  }>;
};

export function isMexicanoMode(mode: string | undefined): boolean {
  return mode === "MEXICANO";
}

export function isRegularScoring(scoringMode?: ScoringMode): boolean {
  return scoringMode === "REGULAR";
}

export function formatScoringLabel(
  mode: string,
  scoringMode?: ScoringMode,
  variant?: string
): string {
  if (scoringMode === "REGULAR") {
    return "Regular scoring";
  }
  if (mode === "MEXICANO") {
    if (variant === "TEAM") return "Team Mexicano";
    if (variant === "MIXED") return "Mixed Mexicano";
    return "Mexicano ladder";
  }
  if (mode === "AMERICANO") return "Americano scoring";
  return `${mode} scoring`;
}

/** Voided: the organizer closed the event without this match being played. */
export function isMatchVoided(
  match: TournamentViewModel["rounds"][number]["matches"][number]
): boolean {
  return match.voidedAt != null;
}

export function isMatchComplete(match: TournamentViewModel["rounds"][number]["matches"][number]): boolean {
  // A voided match is never a result, even if a partial score was entered before it was abandoned.
  if (isMatchVoided(match)) return false;
  if (match.completed === true) return true;
  if (match.completed === false) return false;
  return match.scoreA !== undefined && match.scoreB !== undefined;
}

/** Nothing left to play: either played or voided. */
export function isMatchResolved(
  match: TournamentViewModel["rounds"][number]["matches"][number]
): boolean {
  return isMatchComplete(match) || isMatchVoided(match);
}

export function matchHasProgress(match: TournamentViewModel["rounds"][number]["matches"][number]): boolean {
  if (isMatchVoided(match)) return false;
  if (isMatchComplete(match)) return true;
  if (match.scoreA !== undefined || match.scoreB !== undefined) return true;
  return Boolean(
    match.sets?.some(
      (set) => set.gamesA > 0 || set.gamesB > 0 || set.tbA !== undefined || set.tbB !== undefined
    )
  );
}

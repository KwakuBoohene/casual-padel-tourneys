/**
 * True Mexicano ladder helpers (result-driven pairing).
 *
 * Classic / Mixed (individuals): after round 1 (lottery), courts are filled from
 * the current table: court i plays ranks (4i-3)+(4i-1) vs (4i-2)+(4i) — e.g. 1+3 vs 2+4.
 *
 * Team Mexicano (fixed pairs): units are teams; court i plays team ranks (2i-1) vs (2i)
 * — e.g. 1 vs 2, 3 vs 4. Partners never split.
 *
 * This is not Americano fairness / partner-rotation math.
 */

export const MEXICANO_MIN_PLAYERS = 8;
/** Minimum fixed pairs for Team Mexicano (= 8 players). */
export const MEXICANO_MIN_TEAMS = 4;

export interface MexicanoStandingRow {
  playerId: string;
  totalPoints: number;
  gamesPlayed: number;
}

export interface MexicanoCourtAssignment {
  /** 1-based court number (strongest court = 1). */
  court: number;
  teamA: [string, string];
  teamB: [string, string];
}

export interface MexicanoLadderResult {
  courts: MexicanoCourtAssignment[];
  /** Lowest ranks that did not fit on a court this round. */
  sittingOut: string[];
}

export interface MexicanoTeamCourtAssignment {
  court: number;
  /** Fixed-pair unit ids (not player ids). */
  teamAId: string;
  teamBId: string;
}

export interface MexicanoTeamLadderResult {
  courts: MexicanoTeamCourtAssignment[];
  sittingOut: string[];
}

/** Points descending; ties broken by stable playerId ascending. */
export function compareMexicanoStandings(
  a: MexicanoStandingRow,
  b: MexicanoStandingRow
): number {
  if (b.totalPoints !== a.totalPoints) {
    return b.totalPoints - a.totalPoints;
  }
  if (b.gamesPlayed !== a.gamesPlayed) {
    return b.gamesPlayed - a.gamesPlayed;
  }
  return a.playerId.localeCompare(b.playerId);
}

export function sortMexicanoStandings<T extends MexicanoStandingRow>(rows: T[]): T[] {
  return [...rows].sort(compareMexicanoStandings);
}

/**
 * Map an already-ordered standings list onto courts (individual Mexicano).
 * Capacity = min(floor(n/4), maxCourts) courts; leftover ids sit out.
 */
export function buildMexicanoLadderAssignments(
  orderedPlayerIds: string[],
  maxCourts: number
): MexicanoLadderResult {
  const courtCount = Math.min(Math.floor(orderedPlayerIds.length / 4), Math.max(0, maxCourts));
  const courts: MexicanoCourtAssignment[] = [];

  for (let i = 0; i < courtCount; i += 1) {
    const base = i * 4;
    // Ranks are 1-based: 4i+1, 4i+2, 4i+3, 4i+4 → partners 1+3 vs 2+4
    const r1 = orderedPlayerIds[base];
    const r2 = orderedPlayerIds[base + 1];
    const r3 = orderedPlayerIds[base + 2];
    const r4 = orderedPlayerIds[base + 3];
    courts.push({
      court: i + 1,
      teamA: [r1, r3],
      teamB: [r2, r4]
    });
  }

  return {
    courts,
    sittingOut: orderedPlayerIds.slice(courtCount * 4)
  };
}

/**
 * Map ordered **team** ids onto courts (Team Mexicano).
 * Capacity = min(floor(n/2), maxCourts); leftover teams sit out.
 * Court i: rank (2i-1) vs (2i).
 */
export function buildMexicanoTeamLadderAssignments(
  orderedTeamIds: string[],
  maxCourts: number
): MexicanoTeamLadderResult {
  const courtCount = Math.min(Math.floor(orderedTeamIds.length / 2), Math.max(0, maxCourts));
  const courts: MexicanoTeamCourtAssignment[] = [];

  for (let i = 0; i < courtCount; i += 1) {
    const base = i * 2;
    courts.push({
      court: i + 1,
      teamAId: orderedTeamIds[base],
      teamBId: orderedTeamIds[base + 1]
    });
  }

  return {
    courts,
    sittingOut: orderedTeamIds.slice(courtCount * 2)
  };
}

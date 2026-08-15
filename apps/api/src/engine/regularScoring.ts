import type { MatchSet, RegularScoringConfig } from "@padel/shared";

export type Side = "A" | "B";

export interface SetEvaluation {
  complete: boolean;
  winner: Side | null;
  error?: string;
}

export interface MatchEvaluation {
  complete: boolean;
  winner: Side | null;
  setsWonA: number;
  setsWonB: number;
  gamesWonA: number;
  gamesWonB: number;
  error?: string;
}

export interface RegularAwardDelta {
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
}

function setTarget(format: RegularScoringConfig["setFormat"]): number {
  if (format === "BO3_GAMES") {
    return 2;
  }
  if (format === "BO5_GAMES") {
    return 3;
  }
  return 6;
}

function tbComplete(
  tbA: number | undefined,
  tbB: number | undefined,
  target: number,
  missingMessage: string
): SetEvaluation {
  if (tbA === undefined || tbB === undefined) {
    return { complete: false, winner: null, error: missingMessage };
  }
  if (tbA < 0 || tbB < 0) {
    return { complete: false, winner: null, error: "Tiebreak scores cannot be negative." };
  }
  const max = Math.max(tbA, tbB);
  const min = Math.min(tbA, tbB);
  if (max < target || max - min < 2) {
    return { complete: false, winner: null };
  }
  return { complete: true, winner: tbA > tbB ? "A" : "B" };
}

/**
 * Validates one set line against Regular set format / win-by / set TB rules.
 */
export function evaluateSet(
  set: Pick<MatchSet, "gamesA" | "gamesB" | "tbA" | "tbB">,
  config: RegularScoringConfig
): SetEvaluation {
  const { gamesA, gamesB, tbA, tbB } = set;
  if (gamesA < 0 || gamesB < 0) {
    return { complete: false, winner: null, error: "Games cannot be negative." };
  }

  const target = setTarget(config.setFormat);
  const max = Math.max(gamesA, gamesB);
  const min = Math.min(gamesA, gamesB);
  const diff = Math.abs(gamesA - gamesB);

  if (config.setFormat === "FULL_SET" && config.gameWinBy === 1) {
    if (max > 6 || (gamesA === 6 && gamesB === 6)) {
      return {
        complete: false,
        winner: null,
        error: "Full set win-by-1 ends at 6–5 max (never 7 games or 6–6)."
      };
    }
    if (max === 6 && min <= 5) {
      return { complete: true, winner: gamesA > gamesB ? "A" : "B" };
    }
    return { complete: false, winner: null };
  }

  if (config.setFormat === "FULL_SET" && config.gameWinBy === 2) {
    if (gamesA === 6 && gamesB === 6) {
      const tiebreakTo = config.setTiebreakTo;
      if (tiebreakTo === undefined) {
        return {
          complete: false,
          winner: null,
          error: "setTiebreakTo required for full set win-by-2."
        };
      }
      return tbComplete(tbA, tbB, tiebreakTo, "Set tiebreak scores required at 6–6.");
    }
    if (tbA !== undefined || tbB !== undefined) {
      return {
        complete: false,
        winner: null,
        error: "Set tiebreak only applies at 6–6."
      };
    }
    if (max === 7 && min === 5) {
      return { complete: true, winner: gamesA > gamesB ? "A" : "B" };
    }
    if (max === 6 && min <= 4) {
      return { complete: true, winner: gamesA > gamesB ? "A" : "B" };
    }
    if (max === 6 && min === 5) {
      return { complete: false, winner: null };
    }
    if (max > 7 || (max === 7 && min !== 5)) {
      return {
        complete: false,
        winner: null,
        error: "Invalid full-set score for win-by-2."
      };
    }
    return { complete: false, winner: null };
  }

  // BO3 / BO5 (and non-full formats): first to target with configured margin.
  if (config.gameWinBy === 1) {
    if (max >= target && diff >= 1) {
      return { complete: true, winner: gamesA > gamesB ? "A" : "B" };
    }
    return { complete: false, winner: null };
  }

  if (max >= target && diff >= 2) {
    return { complete: true, winner: gamesA > gamesB ? "A" : "B" };
  }
  return { complete: false, winner: null };
}

function matchTbComplete(
  matchTbA: number | undefined,
  matchTbB: number | undefined
): SetEvaluation {
  // v1: first to 7, win by 2 (same spirit as set TB default).
  return tbComplete(matchTbA, matchTbB, 7, "Match tiebreak scores required when sets are even.");
}

/**
 * Evaluates whether a Regular match is complete and who won.
 */
export function evaluateMatch(
  sets: MatchSet[],
  config: RegularScoringConfig,
  matchTb?: { a?: number; b?: number }
): MatchEvaluation {
  const ordered = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  let setsWonA = 0;
  let setsWonB = 0;
  let gamesWonA = 0;
  let gamesWonB = 0;

  for (const set of ordered) {
    const evaluation = evaluateSet(set, config);
    if (evaluation.error && evaluation.complete === false && set.gamesA === 6 && set.gamesB === 6) {
      return {
        complete: false,
        winner: null,
        setsWonA,
        setsWonB,
        gamesWonA,
        gamesWonB,
        error: evaluation.error
      };
    }
    gamesWonA += set.gamesA;
    gamesWonB += set.gamesB;
    if (!evaluation.complete || !evaluation.winner) {
      return {
        complete: false,
        winner: null,
        setsWonA,
        setsWonB,
        gamesWonA,
        gamesWonB,
        error: evaluation.error
      };
    }
    if (evaluation.winner === "A") {
      setsWonA += 1;
    } else {
      setsWonB += 1;
    }
    if (setsWonA >= config.setsToWin || setsWonB >= config.setsToWin) {
      break;
    }
  }

  if (setsWonA >= config.setsToWin || setsWonB >= config.setsToWin) {
    if (setsWonA === setsWonB) {
      return {
        complete: false,
        winner: null,
        setsWonA,
        setsWonB,
        gamesWonA,
        gamesWonB,
        error: "Both sides cannot reach setsToWin."
      };
    }
    return {
      complete: true,
      winner: setsWonA > setsWonB ? "A" : "B",
      setsWonA,
      setsWonB,
      gamesWonA,
      gamesWonB
    };
  }

  if (config.matchTiebreak && setsWonA === setsWonB && ordered.length > 0) {
    const tb = matchTbComplete(matchTb?.a, matchTb?.b);
    if (tb.error) {
      return {
        complete: false,
        winner: null,
        setsWonA,
        setsWonB,
        gamesWonA,
        gamesWonB,
        error: tb.error
      };
    }
    if (tb.complete && tb.winner) {
      return {
        complete: true,
        winner: tb.winner,
        setsWonA,
        setsWonB,
        gamesWonA,
        gamesWonB
      };
    }
    return {
      complete: false,
      winner: null,
      setsWonA,
      setsWonB,
      gamesWonA,
      gamesWonB,
      error: "Match tiebreak required when sets are even."
    };
  }

  if (setsWonA === setsWonB && ordered.every((set) => evaluateSet(set, config).complete)) {
    return {
      complete: false,
      winner: null,
      setsWonA,
      setsWonB,
      gamesWonA,
      gamesWonB,
      error: config.matchTiebreak
        ? "Match tiebreak required when sets are even."
        : "Match incomplete: sets are even and match tiebreak is disabled."
    };
  }

  return {
    complete: false,
    winner: null,
    setsWonA,
    setsWonB,
    gamesWonA,
    gamesWonB
  };
}

/** Standings deltas for the winning and losing side of a completed Regular match. */
export function awardDeltasForWinner(
  winner: Side,
  evaluation: Pick<MatchEvaluation, "setsWonA" | "setsWonB" | "gamesWonA" | "gamesWonB">
): { winner: RegularAwardDelta; loser: RegularAwardDelta } {
  const winnerSets = winner === "A" ? evaluation.setsWonA : evaluation.setsWonB;
  const loserSets = winner === "A" ? evaluation.setsWonB : evaluation.setsWonA;
  const winnerGames = winner === "A" ? evaluation.gamesWonA : evaluation.gamesWonB;
  const loserGames = winner === "A" ? evaluation.gamesWonB : evaluation.gamesWonA;
  return {
    winner: {
      matchesWon: 1,
      matchesLost: 0,
      setsWon: winnerSets,
      setsLost: loserSets,
      gamesWon: winnerGames,
      gamesLost: loserGames
    },
    loser: {
      matchesWon: 0,
      matchesLost: 1,
      setsWon: loserSets,
      setsLost: winnerSets,
      gamesWon: loserGames,
      gamesLost: winnerGames
    }
  };
}

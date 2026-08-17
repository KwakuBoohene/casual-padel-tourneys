import type { TournamentMode } from "./types/domain.js";

/** Canonical King of the Court mode wire value. */
export const KING_OF_THE_COURT = "KING_OF_THE_COURT" as const;

/**
 * Legacy mode string. Accepted on create/input during rolling deploy; always
 * normalized to {@link KING_OF_THE_COURT}. Remove once all clients send Court.
 */
export const LEGACY_KING_OF_THE_HILL = "KING_OF_THE_HILL" as const;

export function isKingOfTheCourtMode(mode: string | null | undefined): boolean {
  return mode === KING_OF_THE_COURT || mode === LEGACY_KING_OF_THE_HILL;
}

/** Map legacy Hill → Court; leave other modes unchanged. */
export function normalizeTournamentMode(mode: string): string {
  if (mode === LEGACY_KING_OF_THE_HILL) {
    return KING_OF_THE_COURT;
  }
  return mode;
}

export function normalizeToTournamentMode(mode: string): TournamentMode {
  const normalized = normalizeTournamentMode(mode);
  if (
    normalized === "AMERICANO" ||
    normalized === "MEXICANO" ||
    normalized === KING_OF_THE_COURT
  ) {
    return normalized;
  }
  throw new Error(`Unknown tournament mode: ${mode}`);
}

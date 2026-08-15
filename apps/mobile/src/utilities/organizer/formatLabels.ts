import type { ScoringMode, TournamentMode, TournamentVariant } from "@padel/shared";

export function formatTournamentMode(mode: TournamentMode): string {
  return mode === "MEXICANO" ? "Mexicano" : "Americano";
}

/** Live / board header: Regular vs Americano/Mexicano points label. */
export function formatScoringLabel(mode: TournamentMode, scoringMode?: ScoringMode): string {
  if (scoringMode === "REGULAR") {
    return "Regular scoring";
  }
  return `${formatTournamentMode(mode)} scoring`;
}

export function formatTournamentVariant(variant: TournamentVariant): string {
  if (variant === "MIXED") return "Mixed";
  if (variant === "TEAM") return "Team";
  return "Classic";
}

export function formatTournamentModeVariant(
  mode: TournamentMode,
  variant: TournamentVariant
): string {
  return `${formatTournamentMode(mode)} / ${formatTournamentVariant(variant)}`;
}

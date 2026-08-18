import type { ScoringMode, SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";
import { isKingOfTheCourtMode } from "@padel/shared";

export function formatTournamentMode(mode: TournamentMode | string): string {
  if (mode === "MEXICANO") return "Mexicano";
  if (isKingOfTheCourtMode(mode)) return "King of the Court";
  return "Americano";
}

/** Live / board header: Regular vs Americano/Mexicano points label. */
export function formatScoringLabel(mode: TournamentMode, scoringMode?: ScoringMode): string {
  if (scoringMode === "REGULAR") {
    return "Regular scoring";
  }
  return `${formatTournamentMode(mode)} scoring`;
}

export function formatSchedulingMode(mode: SchedulingMode, isMexicano?: boolean): string {
  if (isMexicano || mode === "TOTAL_TIME") return "Timed";
  if (mode === "ROUND_ROBIN") return "Round robin";
  return "Target games";
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

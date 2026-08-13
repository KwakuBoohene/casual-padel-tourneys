import type { TournamentMode, TournamentVariant } from "@padel/shared";

export function formatTournamentMode(mode: TournamentMode): string {
  return mode === "MEXICANO" ? "Mexicano" : "Americano";
}

export function formatTournamentVariant(variant: TournamentVariant): string {
  return variant === "MIXED" ? "Mixed" : "Classic";
}

export function formatTournamentModeVariant(
  mode: TournamentMode,
  variant: TournamentVariant
): string {
  return `${formatTournamentMode(mode)} / ${formatTournamentVariant(variant)}`;
}

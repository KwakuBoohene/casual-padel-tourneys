import type { TournamentMode, TournamentVariant } from "@padel/shared";
import { AMERICANO_MIN_TEAMS, MEXICANO_MIN_TEAMS } from "@padel/shared";

export function isFixedTeamMode(mode: TournamentMode, variant: TournamentVariant): boolean {
  return variant === "TEAM" && (mode === "AMERICANO" || mode === "MEXICANO");
}

export function minTeamsForMode(mode: TournamentMode): number {
  return mode === "AMERICANO" ? AMERICANO_MIN_TEAMS : MEXICANO_MIN_TEAMS;
}

export function teamModeLabel(mode: TournamentMode): string {
  return mode === "AMERICANO" ? "Team Americano" : "Team Mexicano";
}

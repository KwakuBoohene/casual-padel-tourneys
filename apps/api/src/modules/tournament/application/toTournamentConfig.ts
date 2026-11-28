import type { createTournamentSchema, TournamentConfig } from "@padel/shared";
import type { z } from "zod";

export type CreateTournamentInput = z.output<typeof createTournamentSchema>;

/**
 * Map a validated create body to engine config. Shared by `POST /tournaments`
 * and draft start so both produce identical tournaments.
 */
export function toTournamentConfig(data: CreateTournamentInput): TournamentConfig {
  const playersFromTeams =
    data.variant === "TEAM" && data.teams && data.teams.length > 0
      ? data.teams.flatMap((team) => [team.playerA, team.playerB])
      : data.players;
  return {
    ...data,
    players: playersFromTeams,
    teams: data.variant === "TEAM" ? data.teams : undefined,
    scoringMode: data.scoringMode,
    regularScoring: data.regularScoring,
    pointsPerMatch: data.pointsPerMatch ?? 24
  };
}

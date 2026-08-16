import { conflict, forbidden, notFound } from "../../../shared/kernel/appError.js";
import type { TournamentState } from "../../../types/state.js";
import { assertTournamentVersion } from "../domain/helpers.js";
import type { TournamentRepository } from "./ports.js";

export async function requireTournament(
  repo: TournamentRepository,
  tournamentId: string
): Promise<TournamentState> {
  const tournament = await repo.getById(tournamentId);
  if (!tournament) {
    throw notFound("Tournament not found.");
  }
  return tournament;
}

export async function requireOrganizerTournament(
  repo: TournamentRepository,
  tournamentId: string,
  organizerId: string
): Promise<TournamentState> {
  const tournament = await requireTournament(repo, tournamentId);
  if (!tournament.organizerId || tournament.organizerId !== organizerId) {
    // Match legacy organizerAccess: do not leak existence to non-owners.
    throw notFound("Tournament not found.");
  }
  return tournament;
}

export function assertExpectedVersion(tournament: TournamentState, expectedVersion: number): void {
  try {
    assertTournamentVersion(tournament, expectedVersion);
  } catch (error) {
    throw conflict((error as Error).message);
  }
}

export function assertOrganizerId(tournament: TournamentState, organizerId: string): void {
  if (!tournament.organizerId || tournament.organizerId !== organizerId) {
    throw forbidden("Tournament not found.");
  }
}

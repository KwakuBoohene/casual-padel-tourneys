import type { TournamentState } from "../../../types/state.js";
import {
  applyAdvanceMexicanoRound,
  applyEndMexicanoNight
} from "../domain/mexicanoOps.js";
import {
  applyAddPendingPlayer,
  applyIntegratePendingPlayers
} from "../domain/pendingOps.js";
import { assertExpectedVersion, requireOrganizerTournament } from "./loadTournament.js";
import type { TournamentEvents, TournamentRepository } from "./ports.js";

type Deps = { repo: TournamentRepository; events: TournamentEvents };

export async function addPendingPlayer(
  deps: Deps,
  input: {
    tournamentId: string;
    organizerId: string;
    expectedVersion: number;
    name: string;
    gender?: "MALE" | "FEMALE";
  }
): Promise<TournamentState> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  assertExpectedVersion(tournament, input.expectedVersion);
  applyAddPendingPlayer(tournament, input.name, input.gender);
  await deps.repo.save(tournament, input.expectedVersion);
  await deps.events.publish({
    type: "PENDING_PLAYER_ADDED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}

export async function integratePendingPlayers(
  deps: Deps,
  input: { tournamentId: string; organizerId: string; expectedVersion: number }
): Promise<TournamentState> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  assertExpectedVersion(tournament, input.expectedVersion);
  applyIntegratePendingPlayers(tournament);
  await deps.repo.save(tournament, input.expectedVersion);
  await deps.events.publish({
    type: "PENDING_PLAYERS_INTEGRATED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}

export async function advanceMexicanoRound(
  deps: Deps,
  input: { tournamentId: string; organizerId: string; expectedVersion: number }
): Promise<TournamentState> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  assertExpectedVersion(tournament, input.expectedVersion);
  applyAdvanceMexicanoRound(tournament);
  await deps.repo.save(tournament, input.expectedVersion);
  await deps.events.publish({
    type: "ROUND_ADVANCED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}

export async function endMexicanoNight(
  deps: Deps,
  input: { tournamentId: string; organizerId: string; expectedVersion: number }
): Promise<TournamentState> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  assertExpectedVersion(tournament, input.expectedVersion);
  applyEndMexicanoNight(tournament);
  await deps.repo.save(tournament, input.expectedVersion);
  await deps.events.publish({
    type: "TOURNAMENT_ENDED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}

export async function deleteTournament(
  deps: Deps,
  input: { tournamentId: string; organizerId: string; stripCareer?: boolean }
): Promise<void> {
  await requireOrganizerTournament(deps.repo, input.tournamentId, input.organizerId);
  await deps.repo.delete(input.tournamentId, { stripCareer: input.stripCareer === true });
  await deps.events.publish({
    type: "TOURNAMENT_DELETED",
    tournamentId: input.tournamentId,
    payload: { id: input.tournamentId }
  });
}

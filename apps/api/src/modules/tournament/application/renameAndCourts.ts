import type { TournamentState } from "../../../types/state.js";
import {
  applyAdjustCourts,
  applyRenamePlayer,
  applyRenameTournament,
  applySubstitutePlayer
} from "../domain/renameAndCourts.js";
import { assertExpectedVersion, requireOrganizerTournament } from "./loadTournament.js";
import type { TournamentEvents, TournamentRepository } from "./ports.js";

type Deps = { repo: TournamentRepository; events: TournamentEvents };

export async function renamePlayer(
  deps: Deps,
  input: { tournamentId: string; organizerId: string; playerId: string; newName: string }
): Promise<TournamentState> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  const expectedVersion = tournament.version;
  applyRenamePlayer(tournament, input.playerId, input.newName);
  await deps.repo.save(tournament, expectedVersion);
  await deps.events.publish({
    type: "PLAYER_RENAMED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}

export async function renameTournament(
  deps: Deps,
  input: { tournamentId: string; organizerId: string; newName: string }
): Promise<TournamentState> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  const expectedVersion = tournament.version;
  applyRenameTournament(tournament, input.newName);
  await deps.repo.save(tournament, expectedVersion);
  await deps.events.publish({
    type: "TOURNAMENT_RENAMED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}

export async function substitutePlayer(
  deps: Deps,
  input: {
    tournamentId: string;
    organizerId: string;
    playerId: string;
    replacementName: string;
  }
): Promise<TournamentState> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  const expectedVersion = tournament.version;
  applySubstitutePlayer(tournament, input.playerId, input.replacementName);
  await deps.repo.save(tournament, expectedVersion);
  await deps.events.publish({
    type: "PLAYER_SUBSTITUTED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}

export async function adjustCourts(
  deps: Deps,
  input: {
    tournamentId: string;
    organizerId: string;
    expectedVersion: number;
    courts: number;
  }
): Promise<TournamentState> {
  const tournament = await requireOrganizerTournament(
    deps.repo,
    input.tournamentId,
    input.organizerId
  );
  assertExpectedVersion(tournament, input.expectedVersion);
  applyAdjustCourts(tournament, input.courts);
  await deps.repo.save(tournament, input.expectedVersion);
  await deps.events.publish({
    type: "COURTS_ADJUSTED",
    tournamentId: tournament.id,
    payload: tournament
  });
  return tournament;
}

import type { DraftCreateBodies, TournamentDraftPayload, TournamentMode } from "@padel/shared";

import type { DraftRecord } from "../domain/draftView.js";

export interface DraftWrite {
  name: string;
  mode: TournamentMode;
  payload: TournamentDraftPayload;
}

export interface DraftRepository {
  create(input: DraftWrite & { organizerId: string; actorId: string }): Promise<DraftRecord>;
  findActive(id: string): Promise<DraftRecord | null>;
  listOpen(organizerId: string): Promise<DraftRecord[]>;
  /** Open drafts where the user is an active per-draft editor. */
  listCollaborating(userId: string): Promise<DraftRecord[]>;
  /** Optimistic write: false when the version moved or the draft is no longer editable. */
  updateIfVersion(id: string, expectedVersion: number, input: DraftWrite & { actorId: string }): Promise<boolean>;
  softDelete(id: string): Promise<boolean>;
  /** Row lock for start: serializes concurrent starts of the same draft. */
  lockForStart(id: string): Promise<DraftRecord | null>;
  /** Sets startedTournamentId when version matches and the draft is still open. */
  markStarted(id: string, expectedVersion: number, tournamentId: string): Promise<boolean>;
  /** Editors who keep live-control access to the started tournament. */
  grantTournamentAccess(input: { tournamentId: string; sourceDraftId: string; userIds: string[] }): Promise<void>;
}

/** Live tournament as returned by `POST /tournaments` (Americano/Mexicano state or KOH hub). */
export interface StartedTournament {
  id: string;
}

/** Runs the existing create (+ KOH assign) use-cases inside the current request transaction. */
export interface DraftTournamentStarter {
  start(organizerId: string, bodies: DraftCreateBodies): Promise<StartedTournament>;
  load(tournamentId: string, organizerId: string): Promise<StartedTournament | null>;
}

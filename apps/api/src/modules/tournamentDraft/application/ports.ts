import type { TournamentDraftPayload, TournamentMode } from "@padel/shared";

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
  /** Optimistic write: false when the version moved or the draft is no longer editable. */
  updateIfVersion(id: string, expectedVersion: number, input: DraftWrite & { actorId: string }): Promise<boolean>;
  softDelete(id: string): Promise<boolean>;
}

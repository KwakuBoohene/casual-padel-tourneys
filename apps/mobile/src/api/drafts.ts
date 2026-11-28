import type {
  DraftPeople,
  DraftReadiness,
  DraftRole,
  TournamentDraftPayload,
  TournamentDraftSummary
} from "@padel/shared";

import type { KohTournamentHub } from "../types/koh/create";
import type { LiveTournamentState } from "../types/organizer/tournament";
import { apiDelete, apiGet, apiPatch, apiPost, type RequestOptions } from "./client";

export interface DraftDetail {
  id: string;
  organizerId: string;
  name: string;
  mode: TournamentDraftSummary["mode"];
  payload: TournamentDraftPayload;
  version: number;
  role: DraftRole;
  keepAccessAfterStart: boolean;
  startedTournamentId: string | null;
  updatedAt: string;
  updatedBy: { id: string; name: string };
  readiness: DraftReadiness;
}

export const listDrafts = () => apiGet<{ data: TournamentDraftSummary[] }>("/drafts").then((response) => response.data);

export const getDraft = (id: string) =>
  apiGet<{ data: DraftDetail }>(`/drafts/${encodeURIComponent(id)}`).then((response) => response.data);

export const createDraft = (payload: TournamentDraftPayload) =>
  apiPost<{ data: DraftDetail }>("/drafts", { payload }).then((response) => response.data);

export const updateDraft = (
  id: string,
  payload: TournamentDraftPayload,
  expectedVersion: number,
  options?: RequestOptions
) =>
  apiPatch<{ data: DraftDetail }>(`/drafts/${encodeURIComponent(id)}`, { payload, expectedVersion }, options).then(
    (response) => response.data
  );

export const deleteDraft = (id: string) => apiDelete<{ ok: true }>(`/drafts/${encodeURIComponent(id)}`);

/** Same `{ data }` as `POST /tournaments` (KOH: the hub), plus `alreadyStarted` for retries. */
export interface StartDraftResponse {
  data: LiveTournamentState | KohTournamentHub;
  alreadyStarted: boolean;
}

export const startDraft = (id: string, expectedVersion: number) =>
  apiPost<StartDraftResponse>(`/drafts/${encodeURIComponent(id)}/start`, { expectedVersion });

export const getDraftPeople = (id: string) =>
  apiGet<{ data: DraftPeople }>(`/drafts/${encodeURIComponent(id)}/people`).then((response) => response.data);

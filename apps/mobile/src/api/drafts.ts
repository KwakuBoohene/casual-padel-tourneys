import type {
  DraftReadiness,
  DraftRole,
  TournamentDraftPayload,
  TournamentDraftSummary
} from "@padel/shared";

import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

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

export const updateDraft = (id: string, payload: TournamentDraftPayload, expectedVersion: number) =>
  apiPatch<{ data: DraftDetail }>(`/drafts/${encodeURIComponent(id)}`, { payload, expectedVersion }).then(
    (response) => response.data
  );

export const deleteDraft = (id: string) => apiDelete<{ ok: true }>(`/drafts/${encodeURIComponent(id)}`);

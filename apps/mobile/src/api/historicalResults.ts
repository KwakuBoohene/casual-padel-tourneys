import type {
  HistoricalImportDetail,
  HistoricalImportSummary,
  HistoricalPreview,
  HistoricalMetadata,
  HistoricalMapping
} from "@padel/shared";
import { apiGet, apiPost, apiPatch } from "./client";
const base = (owner: string) => `/organizers/${encodeURIComponent(owner)}/result-imports`;
export const listHistoricalResults = (owner: string) =>
  apiGet<{ data: HistoricalImportSummary[] }>(base(owner));
export const getHistoricalResult = (owner: string, id: string) =>
  apiGet<{ data: HistoricalImportDetail }>(`${base(owner)}/${id}`);
export const previewHistoricalResults = (
  owner: string,
  input: {
    csv: string;
    filename: string;
    metadata?: Partial<HistoricalMetadata>;
    mappings?: HistoricalMapping[];
    confirmed?: boolean;
    reason?: string;
    distinctReason?: string;
    expectedVersion?: number;
  },
  id?: string
) =>
  apiPost<{ data: HistoricalPreview }>(base(owner) + (id ? `/${id}/revisions/preview` : "/preview"), input);
export const commitHistoricalResults = (owner: string, previewToken: string, id?: string) =>
  apiPost<{ data: { id: string; replayed: boolean } }>(base(owner) + (id ? `/${id}/revisions` : ""), {
    previewToken
  });
export const includeHistoricalResults = (
  owner: string,
  id: string,
  expectedVersion: number,
  included: boolean
) => apiPatch(`${base(owner)}/${id}/inclusion`, { expectedVersion, included });

/** Minimal, provider-neutral shapes for the GA4 Data API (v1beta) used by reports. */
export interface Ga4ReportRequest {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  dimensionFilter?: unknown;
  limit?: number;
  keepEmptyRows?: boolean;
}

export interface Ga4ReportRow {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}

export interface Ga4ReportResponse {
  rows?: Ga4ReportRow[];
  metadata?: { dataLossFromOtherRow?: boolean; subjectToThresholding?: boolean };
}

export interface Ga4RealtimeRequest {
  metrics: { name: string }[];
  minuteRanges: { startMinutesAgo: number; endMinutesAgo: number }[];
}

export type Ga4ErrorKind = "quota" | "invalid" | "failed";
export class Ga4ProviderError extends Error {
  constructor(
    readonly kind: Ga4ErrorKind,
    message: string
  ) {
    super(message);
    this.name = "Ga4ProviderError";
  }
}

export interface Ga4DataClient {
  batchRunReports(propertyId: string, requests: Ga4ReportRequest[]): Promise<Ga4ReportResponse[]>;
  runReport(propertyId: string, request: Ga4ReportRequest): Promise<Ga4ReportResponse>;
  runRealtimeReport(propertyId: string, request: Ga4RealtimeRequest): Promise<Ga4ReportResponse>;
}

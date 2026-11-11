/** Contract for protected GA4 aggregates served to the platform admin dashboard. */
export type Ga4ReportSurface = "viewer" | "organizer";

/**
 * - ok: successful provider report (zeros are real zeros).
 * - not_configured: reporting is disabled or credentials/property are missing; no data is implied.
 * - quota_exceeded: Google throttled the request; retry later.
 * - unavailable: the provider failed or timed out.
 */
export type Ga4Availability = "ok" | "not_configured" | "quota_exceeded" | "unavailable";

export interface Ga4Window {
  /** Inclusive Africa/Accra calendar dates (YYYY-MM-DD). */
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  days: number;
  timezone: "Africa/Accra";
  /** True when the window includes dates GA4 may still be processing. */
  provisional: boolean;
}

export interface Ga4ReportEnvelope<T> {
  source: "ga4";
  surface: Ga4ReportSurface;
  availability: Ga4Availability;
  window: Ga4Window | null;
  /** ISO time of the last successful provider fetch behind `data`. */
  fetchedAt: string | null;
  /** True when `data` is a cached result served after a failed refresh. */
  stale: boolean;
  data: T | null;
  notes: string[];
}

export interface Ga4Totals {
  activeUsers: number;
  sessions: number;
  views: number;
  /** 0..1 from GA4, or null when the period has no sessions. */
  engagementRate: number | null;
}

export interface Ga4DailyPoint {
  date: string;
  sessions: number;
}
export interface Ga4ChannelPoint {
  channel: string;
  sessions: number;
}
export interface Ga4DevicePoint {
  device: "desktop" | "mobile" | "tablet" | "other";
  sessions: number;
}
export interface Ga4PageTypePoint {
  page: "tournament_overview" | "scoreboard" | "leaderboard" | "other";
  views: number;
}

export interface Ga4ViewerReport {
  totals: { current: Ga4Totals; previous: Ga4Totals };
  daily: Ga4DailyPoint[];
  /** Equal-length prior calendar window for the comparison trend. */
  previousDaily: Ga4DailyPoint[];
  channels: Ga4ChannelPoint[];
  devices: Ga4DevicePoint[];
  /** Null when the page-type custom dimension is not registered or the report failed. */
  pageTypes: Ga4PageTypePoint[] | null;
  /** True when GA4 withheld or grouped rows (thresholding or an "other" row). */
  partial: boolean;
}

export interface Ga4ViewerRealtime {
  activeUsers: number;
  windowMinutes: 30;
}

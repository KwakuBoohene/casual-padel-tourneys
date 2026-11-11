import type {
  Ga4ChannelPoint,
  Ga4DailyPoint,
  Ga4DevicePoint,
  Ga4PageTypePoint,
  Ga4Totals,
  Ga4Window
} from "@padel/shared";
import { eachDate } from "../domain/ga4Window.js";
import type { Ga4ReportRequest, Ga4ReportResponse, Ga4ReportRow } from "./ga4DataClient.js";

const compact = (date: string) => date.replaceAll("-", "");
const range = (startDate: string, endDate: string) => ({ startDate, endDate });
const num = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const dim = (row: Ga4ReportRow, index = 0) => row.dimensionValues?.[index]?.value ?? "";
const metric = (row: Ga4ReportRow, index = 0) => num(row.metricValues?.[index]?.value);

/** Fixed report shapes. Page type is separate so a missing custom dimension cannot fail the rest. */
export function viewerRequests(window: Ga4Window): Ga4ReportRequest[] {
  const current = [range(window.from, window.to)];
  return [
    {
      dateRanges: [...current, range(window.previousFrom, window.previousTo)],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "engagementRate" }
      ]
    },
    { dateRanges: current, dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }], limit: 400 },
    {
      dateRanges: current,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      limit: 25
    },
    {
      dateRanges: current,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }],
      limit: 10
    },
    {
      dateRanges: [range(window.previousFrom, window.previousTo)],
      dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }], limit: 400
    }
  ];
}

export function pageTypeRequest(window: Ga4Window): Ga4ReportRequest {
  return {
    dateRanges: [range(window.from, window.to)],
    dimensions: [{ name: "customEvent:page_type" }],
    metrics: [{ name: "screenPageViews" }],
    limit: 25
  };
}

const EMPTY_TOTALS: Ga4Totals = { activeUsers: 0, sessions: 0, views: 0, engagementRate: null };

export function parseTotals(report: Ga4ReportResponse) {
  const totals = { current: { ...EMPTY_TOTALS }, previous: { ...EMPTY_TOTALS } };
  for (const row of report.rows ?? []) {
    // With two date ranges GA4 labels rows date_range_0 (current) and date_range_1 (previous).
    const target = dim(row) === "date_range_1" ? "previous" : "current";
    const sessions = metric(row, 1);
    totals[target] = {
      activeUsers: metric(row, 0),
      sessions,
      views: metric(row, 2),
      engagementRate: sessions > 0 ? metric(row, 3) : null
    };
  }
  return totals;
}

export function parseDaily(report: Ga4ReportResponse, window: Ga4Window): Ga4DailyPoint[] {
  const bySession = new Map<string, number>();
  for (const row of report.rows ?? []) bySession.set(dim(row), metric(row));
  // GA4 omits days with no data; fill them so a gap is a visible zero, not a missing point.
  return eachDate(window.from, window.to).map((date) => ({
    date,
    sessions: bySession.get(compact(date)) ?? 0
  }));
}

const CHANNELS = new Set([
  "Direct", "Organic Search", "Organic Social", "Paid Search", "Paid Social",
  "Referral", "Email", "Display", "Affiliates", "Organic Video", "Unassigned"
]);
function grouped<K extends string>(report: Ga4ReportResponse, bucket: (raw: string) => K) {
  const totals = new Map<K, number>();
  for (const row of report.rows ?? []) {
    const key = bucket(dim(row));
    totals.set(key, (totals.get(key) ?? 0) + metric(row));
  }
  return [...totals].sort((a, b) => b[1] - a[1]);
}

export function parseChannels(report: Ga4ReportResponse): Ga4ChannelPoint[] {
  return grouped(report, (raw) => (CHANNELS.has(raw) ? raw : raw === "(not set)" ? "Unassigned" : "Other")).map(
    ([channel, sessions]) => ({ channel, sessions })
  );
}

const DEVICES = ["desktop", "mobile", "tablet"] as const;
export function parseDevices(report: Ga4ReportResponse): Ga4DevicePoint[] {
  return grouped(report, (raw): Ga4DevicePoint["device"] =>
    (DEVICES as readonly string[]).includes(raw) ? (raw as (typeof DEVICES)[number]) : "other"
  ).map(([device, sessions]) => ({ device, sessions }));
}

const PAGES = ["tournament_overview", "scoreboard", "leaderboard"] as const;
export function parsePageTypes(report: Ga4ReportResponse): Ga4PageTypePoint[] {
  return grouped(report, (raw): Ga4PageTypePoint["page"] =>
    (PAGES as readonly string[]).includes(raw) ? (raw as (typeof PAGES)[number]) : "other"
  ).map(([page, views]) => ({ page, views }));
}

export const isPartial = (reports: Ga4ReportResponse[]) =>
  reports.some((r) => r.metadata?.dataLossFromOtherRow || r.metadata?.subjectToThresholding);

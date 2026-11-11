import type {
  Ga4Availability,
  Ga4ReportEnvelope,
  Ga4ReportSurface,
  Ga4OrganizerReport,
  Ga4ViewerRealtime,
  Ga4ViewerReport,
  Ga4Window
} from "@padel/shared";
import { ga4Window } from "../domain/ga4Window.js";
import { Ga4Cache } from "./ga4Cache.js";
import { Ga4ProviderError, type Ga4DataClient, type Ga4ReportRequest, type Ga4ReportResponse } from "./ga4DataClient.js";
import {
  isPartial,
  pageTypeRequest,
  parseChannels,
  parseDaily,
  parseDevices,
  parsePageTypes,
  parseTotals,
  viewerRequests
} from "./ga4ViewerReport.js";

import { creationStepsRequest, featureRequest, organizerRequests, parseCreationSteps, parseFeatures, parseMilestones } from "./ga4OrganizerReport.js";

const HISTORICAL_TTL_MS = 15 * 60_000;
const REALTIME_TTL_MS = 60_000;

export interface Ga4ReportsOptions {
  /** Null means reporting is not configured: every call reports `not_configured` without a request. */
  client: Ga4DataClient | null;
  properties: Partial<Record<Ga4ReportSurface, string>>;
  environment: string;
  cache?: Ga4Cache;
  now?: () => Date;
}

export class Ga4Reports {
  private readonly cache: Ga4Cache;
  private readonly now: () => Date;

  constructor(private readonly options: Ga4ReportsOptions) {
    this.cache = options.cache ?? new Ga4Cache();
    this.now = options.now ?? (() => new Date());
  }

  async viewer(input: { from?: string; to?: string }): Promise<Ga4ReportEnvelope<Ga4ViewerReport>> {
    const window = ga4Window(input, this.now());
    return this.run("viewer", window, "report", HISTORICAL_TTL_MS, (client, property) =>
      this.loadViewer(client, property, window)
    );
  }

  async organizer(input: { from?: string; to?: string }): Promise<Ga4ReportEnvelope<Ga4OrganizerReport>> {
    const window = ga4Window(input, this.now());
    return this.run("organizer", window, "organizer-report", HISTORICAL_TTL_MS, async (client, property) => {
      const batch = await client.batchRunReports(property, organizerRequests(window));
      const [totals, daily, devices, previousDaily, milestones] = batch;
      if (!totals || !daily || !devices || !previousDaily || !milestones)
        throw new Ga4ProviderError("failed", "Incomplete GA4 batch.");
      const notes = [
        "Organizer web usage covers devices with Usage analytics enabled; it does not represent all organizer accounts or native app usage.",
        "Creation milestones are independent event counts, not an ordered funnel or unique tournament counts.",
        "Active users can appear in several feature areas; feature users must not be added together."
      ];
      const optional = async <T>(request: Ga4ReportRequest, parse: (report: Ga4ReportResponse) => T, label: string): Promise<T | null> => {
        try {
          const report = await client.runReport(property, request);
          batch.push(report);
          return parse(report);
        } catch (error) {
          if (error instanceof Ga4ProviderError && error.kind === "quota") throw error;
          notes.push(`${label} are unavailable. Check the GA4 custom dimension registration and provider status.`);
          return null;
        }
      };
      const features = await optional(featureRequest(window), parseFeatures, "Feature areas");
      const creationSteps = await optional(creationStepsRequest(window), parseCreationSteps, "Creation steps");
      const partial = isPartial(batch);
      if (partial) notes.push("GA4 withheld or grouped some rows (thresholding or an 'other' row).");
      if (window.provisional) notes.push("Recent days may change while GA4 finishes processing.");
      return { data: {
        totals: parseTotals(totals), daily: parseDaily(daily, window),
        previousDaily: parseDaily(previousDaily, { ...window, from: window.previousFrom, to: window.previousTo }),
        devices: parseDevices(devices), features, milestones: parseMilestones(milestones), creationSteps, partial
      }, notes };
    });
  }

  async viewerRealtime(): Promise<Ga4ReportEnvelope<Ga4ViewerRealtime>> {
    return this.run("viewer", null, "realtime", REALTIME_TTL_MS, async (client, property) => {
      const report = await client.runRealtimeReport(property, {
        metrics: [{ name: "activeUsers" }],
        minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }]
      });
      const value = Number(report.rows?.[0]?.metricValues?.[0]?.value ?? 0);
      return { data: { activeUsers: Number.isFinite(value) ? value : 0, windowMinutes: 30 as const }, notes: [] };
    });
  }

  private async loadViewer(client: Ga4DataClient, property: string, window: Ga4Window) {
    const [totals, daily, channels, devices, previousDaily] = await client.batchRunReports(property, viewerRequests(window));
    if (!totals || !daily || !channels || !devices || !previousDaily) throw new Ga4ProviderError("failed", "Incomplete GA4 batch.");
    const notes: string[] = [];
    let pageTypes: Ga4ViewerReport["pageTypes"] = null;
    let pageReport = null;
    try {
      pageReport = await client.runReport(property, pageTypeRequest(window));
      pageTypes = parsePageTypes(pageReport);
    } catch (error) {
      if (error instanceof Ga4ProviderError && error.kind === "quota") throw error;
      notes.push("Views by page type are unavailable until the page_type dimension is registered in GA4.");
    }
    if (window.provisional) notes.push("Recent days may change while GA4 finishes processing.");
    const partial = isPartial(pageReport ? [totals, daily, channels, devices, previousDaily, pageReport] : [totals, daily, channels, devices, previousDaily]);
    if (partial) notes.push("GA4 withheld or grouped some rows (thresholding or an 'other' row).");
    return {
      data: {
        totals: parseTotals(totals),
        daily: parseDaily(daily, window),
        previousDaily: parseDaily(previousDaily, { ...window, from: window.previousFrom, to: window.previousTo }),
        channels: parseChannels(channels),
        devices: parseDevices(devices),
        pageTypes,
        partial
      },
      notes
    };
  }

  private async run<T>(
    surface: Ga4ReportSurface,
    window: Ga4Window | null,
    shape: string,
    ttlMs: number,
    load: (client: Ga4DataClient, property: string) => Promise<{ data: T; notes: string[] }>
  ): Promise<Ga4ReportEnvelope<T>> {
    const { client } = this.options;
    const property = this.options.properties[surface];
    const base = { source: "ga4" as const, surface, window, fetchedAt: null, stale: false, data: null, notes: [] };
    if (!client || !property) {
      return { ...base, availability: "not_configured", notes: ["GA4 reporting is not configured for this surface."] };
    }
    // Keyed by environment, property, report shape and date range so surfaces never share entries.
    const key = [this.options.environment, surface, property, shape, window?.from, window?.to, "v2"].join("|");
    try {
      const result = await this.cache.get(key, ttlMs, () => load(client, property));
      return {
        ...base,
        availability: "ok",
        fetchedAt: result.fetchedAt.toISOString(),
        stale: result.stale,
        data: result.value.data,
        notes: result.stale ? [...result.value.notes, "Showing the last successful result."] : result.value.notes
      };
    } catch (error) {
      const availability: Ga4Availability =
        error instanceof Ga4ProviderError && error.kind === "quota" ? "quota_exceeded" : "unavailable";
      return {
        ...base,
        availability,
        notes: [availability === "quota_exceeded" ? "GA4 quota was exceeded. Try again later." : "GA4 data is temporarily unavailable."]
      };
    }
  }
}

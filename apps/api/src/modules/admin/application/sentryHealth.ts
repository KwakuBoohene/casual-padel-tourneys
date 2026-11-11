import type { SentryHealthReport } from "@padel/shared";
import { validation } from "../../../shared/kernel/appError.js";
import { reportingRange } from "../domain/reporting.js";
import { Ga4Cache } from "./ga4Cache.js";
import { SentryReadError, type SentryIssuesClient } from "./sentryIssues.js";

export interface SentryHealthScope {
  baseUrl: string;
  organization: string;
  projectIds: string[];
  environment: string;
  firstSeenVerified: boolean;
}

export class SentryHealth {
  constructor(
    private readonly config: SentryHealthScope | null,
    private readonly client: SentryIssuesClient | null,
    private readonly cache = new Ga4Cache({ maxEntries: 64, maxStaleMs: 30 * 60_000 }),
    private readonly now = () => new Date()
  ) {}

  async summary(input: { from?: string; to?: string }): Promise<SentryHealthReport> {
    const now = this.now();
    const range = reportingRange(input, now);
    const from = range.from.toISOString();
    const to = new Date(Math.min(range.to.getTime(), now.getTime())).toISOString();
    if (from >= to) throw validation("The health range must begin before now and its end.");
    const base = { source: "sentry" as const, window: { from, to, timezone: "Africa/Accra" as const },
      fetchedAt: null, stale: false, data: null, notes: [] };
    const config = this.config;
    if (!config || !this.client) return { ...base, availability: "not_configured", notes: ["Sentry health reads are disabled or not configured."] };
    const key = JSON.stringify(["sentry-health-v1", config.baseUrl, config.organization, config.projectIds,
      config.environment, config.firstSeenVerified, from, input.to ? range.to.toISOString() : "current"]);
    try {
      const result = await this.cache.get(key, 5 * 60_000, async () => {
        const scan = await this.client!.read(from, to);
        const distinct = new Map(scan.issues.map((issue) => [issue.id, issue]));
        const firstSeen = [...distinct.values()].map((issue) =>
          /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(issue.firstSeen ?? "") ? Date.parse(issue.firstSeen!) : NaN);
        const validFirstSeen = config.firstSeenVerified && firstSeen.every(Number.isFinite);
        return { window: base.window, data: { observedIssues: distinct.size,
          newIssues: validFirstSeen ? firstSeen.filter((at) => at >= Date.parse(from) && at < Date.parse(to)).length : null,
          regressions: null, partial: scan.partial } };
      });
      const notes = [
        `Error issues with activity in the configured ${config.environment} environment and explicit project allowlist; deleted or unretained issues are not reconstructed.`,
        "Regressions are unavailable: issue status does not substantiate a regression timestamp in this period."
      ];
      if (result.value.data.newIssues === null) notes.push("New issues are unavailable until first-seen environment semantics are verified against the configured projects and valid timestamps are returned.");
      if (result.value.data.partial) notes.push("Partial scan: pagination or project coverage was incomplete. Numeric counts are lower bounds.");
      if (result.stale) notes.push("Showing the last successful Sentry result after a failed refresh.");
      return { ...base, availability: "ok", data: result.value.data, window: result.value.window, notes, stale: result.stale, fetchedAt: result.fetchedAt.toISOString() };
    } catch (error) {
      const availability = error instanceof SentryReadError ? error.kind : "unavailable";
      return { ...base, availability, notes: [availability === "unauthorized" ? "Sentry read access was denied. Check the server-only token and project permissions."
        : availability === "quota_exceeded" ? "Sentry rate limit exceeded. Try again later." : "Sentry health is temporarily unavailable."] };
    }
  }
}


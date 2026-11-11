import type { SentryHealthConfig } from "./sentryHealthConfig.js";

import { SentryReadError, type SentryIssuesClient, type SentryIssueSummary, type SentryIssueScan } from "../application/sentryIssues.js";

/** Fixed Organization Issues API; never follows provider links or exposes raw issue payloads. */
export class HttpSentryIssuesClient implements SentryIssuesClient {
  constructor(private readonly config: SentryHealthConfig, private readonly fetcher: typeof fetch = fetch) {}

  async read(from: string, to: string): Promise<SentryIssueScan> {
    const url = new URL(`/api/0/organizations/${this.config.organization}/issues/`, this.config.baseUrl);
    for (const id of this.config.projectIds) url.searchParams.append("project", id);
    url.searchParams.set("environment", this.config.environment);
    url.searchParams.set("start", from);
    url.searchParams.set("end", to);
    url.searchParams.set("query", "issue.category:error"); // Overrides Sentry's default unresolved-only query.
    url.searchParams.set("sort", "date");
    url.searchParams.set("limit", "100");
    const signal = AbortSignal.timeout(8_000); // One budget for the entire scan, including pagination.
    const issues: SentryIssueSummary[] = [];
    const cursors = new Set<string>();
    let partial = false;
    try {
      for (let page = 0; page < 5; page++) {
        const response = await this.fetcher(url, {
          signal, redirect: "error", headers: { Authorization: `Bearer ${this.config.token}`, Accept: "application/json" }
        });
        if (!response.ok) throw new SentryReadError(response.status === 401 || response.status === 403
          ? "unauthorized" : response.status === 429 ? "quota_exceeded" : "unavailable");
        const body: unknown = await response.json();
        if (!Array.isArray(body) || body.length > 100) throw new SentryReadError("unavailable");
        for (const raw of body) {
          if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || !/^\d{1,32}$/.test(raw.id) ||
              !raw.project || !this.config.projectIds.includes(raw.project.id)) {
            partial = true;
            continue;
          }
          // Discard titles, messages, event detail and all other upstream fields immediately.
          issues.push({ id: raw.id, project: { id: raw.project.id },
            firstSeen: typeof raw.firstSeen === "string" ? raw.firstSeen : null });
        }
        const next = response.headers.get("link")?.split(",").find((part) => /rel="next"/.test(part));
        if (!next || !/results="true"/.test(next)) return { issues, partial: partial || (!next && body.length === 100) };
        const link = /<([^>]+)>/.exec(next)?.[1];
        const cursor = /cursor="([^"]+)"/.exec(next)?.[1] ?? (link ? new URL(link, url).searchParams.get("cursor") : null);
        if (!cursor || !/^[a-zA-Z0-9:_=-]{1,256}$/.test(cursor)) throw new SentryReadError("unavailable");
        if (cursors.has(cursor) || page === 4) return { issues, partial: true };
        cursors.add(cursor);
        // Copy only the cursor. Project, environment, dates, origin and path stay fixed.
        url.searchParams.set("cursor", cursor);
      }
    } catch (error) {
      if (error instanceof SentryReadError) throw error;
      throw new SentryReadError("unavailable");
    }
    return { issues, partial: true };
  }
}

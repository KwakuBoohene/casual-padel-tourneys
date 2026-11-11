/** Admin-only aggregates. Never includes issue payloads, project identifiers or credentials. */
export interface SentryHealthReport {
  source: "sentry";
  availability: "ok" | "not_configured" | "unauthorized" | "quota_exceeded" | "unavailable";
  window: { from: string; to: string; timezone: "Africa/Accra" };
  fetchedAt: string | null;
  stale: boolean;
  data: {
    observedIssues: number;
    /** Null until firstSeen's environment/lifetime behavior has been checked against live projects. */
    newIssues: number | null;
    /** Current issue status does not substantiate when a regression occurred. */
    regressions: null;
    /** Numeric counts are lower bounds when pagination or project coverage is incomplete. */
    partial: boolean;
  } | null;
  notes: string[];
}

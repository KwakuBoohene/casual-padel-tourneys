export class SentryReadError extends Error {
  constructor(readonly kind: "unauthorized" | "quota_exceeded" | "unavailable") {
    super("Sentry summary could not be read.");
  }
}
export interface SentryIssueSummary {
  id: string;
  project: { id: string };
  firstSeen?: string | null;
}
export interface SentryIssueScan { issues: SentryIssueSummary[]; partial: boolean }
export interface SentryIssuesClient {
  read(from: string, to: string): Promise<SentryIssueScan>;
}


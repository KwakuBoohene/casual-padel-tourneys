import type { SentryHealthReport } from "@padel/shared";
import { timestamp } from "../../lib/admin/reportFilters";
import { ReportState } from "./ReportParts";
import { AdminIcon } from "./AdminIcon";
import { SentryLink } from "./SentryLink";
import { useAdminReport } from "./useAdminReport";

/** Fetched independently so provider failure cannot hide first-party or GA4 reports. */
export function PlatformHealth({ query, revision, retry }: { query: string; revision: number; retry(): void }) {
  const state = useAdminReport<SentryHealthReport>(`/admin/health?${query}`, revision);
  const report = state?.data;
  const data = report?.data;
  return (
    <section className="admin-panel min-w-0" aria-label="Platform health">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Platform health</h2>
        <span className="admin-sentry-badge rounded-2xl px-2 py-1 text-[0.625rem] font-semibold">SENTRY</span>
      </div>
      <p className="mt-1 mb-4 text-xs text-padel-muted">Error issue summary for the selected period</p>
      {!report ? <ReportState error={state?.error} retry={retry} /> : <>
        {report.availability !== "ok" && <p role="status" className="text-sm text-padel-muted">
          {report.availability === "not_configured" ? "Sentry health reads are not configured."
            : report.availability === "unauthorized" ? "Sentry read access denied."
              : report.availability === "quota_exceeded" ? "Sentry rate limit exceeded."
                : "Sentry health is temporarily unavailable."}
        </p>}
        {report.stale && <p role="status" className="mb-3 text-sm text-padel-muted">Stale data · showing the last successful Sentry result.</p>}
        {data?.partial && <p role="status" className="mb-3 text-sm text-padel-muted">Partial scan · numeric counts are lower bounds.</p>}
        {data && <dl className="grid gap-4">
          {([
            ["Issues observed", data.observedIssues, "Distinct error issues with activity in the configured scope"],
            ["New issues", data.newIssues, data.newIssues === null ? "Unavailable until first-seen scope is verified" : "First seen this period in the verified scope"],
            ["Regressions", data.regressions, "Unavailable without a verified regression timestamp"]
          ] as const).map(([title, value, description]) => <div className="grid grid-cols-[auto_1fr] items-center gap-x-3" key={title}>
            <dt className="col-start-2 text-sm font-bold">{title}<span className="block text-xs font-normal text-padel-muted">{description}</span></dt>
            <dd className="admin-sentry-badge col-start-1 row-start-1 min-w-12 rounded-lg px-2 py-1.5 text-center text-lg font-bold tabular-nums">
              {value === null ? <span className="text-xs">Unavailable</span> : `${data.partial ? "≥ " : ""}${Number(value).toLocaleString()}`}
            </dd>
          </div>)}
        </dl>}
        {report.fetchedAt && <p className="mt-4 text-xs text-padel-muted">Last successful fetch: {timestamp(report.fetchedAt)}</p>}
        <details className="mt-3 text-xs text-padel-muted">
          <summary>Scope and coverage</summary>
          <p className="mt-2">{timestamp(report.window.from)} inclusive → {timestamp(report.window.to)} exclusive · Africa/Accra</p>
          <ul className="mt-2 list-disc pl-4">{report.notes.map((note) => <li key={note}>{note}</li>)}</ul>
        </details>
      </>}
      <div className="mt-4 border-t border-padel-border pt-3 text-xs font-bold">
        <SentryLink className="admin-sentry-link flex items-center justify-between gap-2" label="Open in Sentry" endIcon={<AdminIcon name="external" />} />
      </div>
    </section>
  );
}

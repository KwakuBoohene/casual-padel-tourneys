import type { Ga4ReportEnvelope, Ga4Totals } from "@padel/shared";
import { comparison, count, percent } from "../../lib/admin/ga4Presentation";
import { timestamp } from "../../lib/admin/reportFilters";

export function Ga4Badge() {
  return <span className="ga4-badge rounded-2xl px-2 py-1 text-[0.625rem] font-semibold">GA4</span>;
}
export function Ga4Notes({ report }: { report: Ga4ReportEnvelope<unknown> }) {
  const status =
    report.availability === "not_configured"
      ? "GA4 reporting is not configured."
      : report.availability === "quota_exceeded"
        ? "GA4 quota exceeded. Try again later."
        : report.availability !== "ok"
          ? "GA4 is temporarily unavailable."
          : report.stale
            ? "Stale data · showing the last successful result."
            : null;
  return (
    <div className="text-sm text-padel-muted" role="status">
      {status && <p className="font-semibold">{status}</p>}
      {report.fetchedAt && <p>Last successful fetch: {timestamp(report.fetchedAt)}</p>}
      {report.window && (
        <p>
          {report.window.from} – {report.window.to} inclusive · Africa/Accra. Comparison:{" "}
          {report.window.previousFrom} – {report.window.previousTo}.
        </p>
      )}
      {report.window?.provisional && <p>Incomplete / provisional days: the latest 48 hours may change.</p>}
      {report.notes.length > 0 && (
        <ul className="list-disc pl-5">
          {report.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function Ga4Metrics({
  totals,
  compact = false
}: {
  totals: { current: Ga4Totals; previous: Ga4Totals };
  compact?: boolean;
}) {
  const fields = [
    ["Active viewers", "activeUsers"],
    ["Sessions", "sessions"],
    ...(!compact
      ? ([
          ["Page views", "views"],
          ["Engagement rate", "engagementRate"]
        ] as const)
      : [])
  ] as const;
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${compact ? "" : "xl:grid-cols-4"}`}>
      {fields.map(([title, key]) => {
        const current = totals.current[key];
        const previous = totals.previous[key];
        return (
          <section className="admin-panel" key={key}>
            <div className="flex items-center justify-between gap-2 text-sm font-semibold text-padel-muted">
              <h2>{title}</h2>
              <Ga4Badge />
            </div>
            <p className="my-1 text-3xl font-bold tabular-nums">
              {key === "engagementRate" ? percent(current) : count(current ?? 0)}
            </p>
            <p className="text-xs text-padel-muted">
              {comparison(current, previous, key === "engagementRate")}
            </p>
          </section>
        );
      })}
    </div>
  );
}

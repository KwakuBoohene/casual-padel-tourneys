import type { Ga4ReportEnvelope, Ga4ViewerRealtime, Ga4ViewerReport } from "@padel/shared";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminLink } from "../../lib/admin/reportFilters";
import { count, pageLabels, share } from "../../lib/admin/ga4Presentation";
import { Cell, ReportState, ReportTable } from "./ReportParts";
import { Ga4Badge, Ga4Metrics, Ga4Notes } from "./Ga4Parts";
import { Ga4SessionChart } from "./Ga4SessionChart";
import { useAdminReport } from "./useAdminReport";

export function ViewerIntelligence({
  query,
  range,
  revision,
  retry,
  compact = false
}: {
  query: string;
  range: URLSearchParams;
  revision: number;
  retry(): void;
  compact?: boolean;
}) {
  const state = useAdminReport<Ga4ReportEnvelope<Ga4ViewerReport>>(`/admin/ga4/viewer?${query}`, revision);
  const report = state?.data;
  return (
    <section className="grid gap-4" aria-label={compact ? "Viewer traffic summary" : "Viewer intelligence"}>
      {compact && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Viewer traffic</h2>
          <Link to={adminLink("/admin/viewer", range)}>View Viewer intelligence</Link>
        </div>
      )}
      <p className="text-sm text-padel-muted">
        GA4 · consenting public Viewer audience only. Excludes Organizer web and first-party Activity
        reporting. Counts do not represent all visitors.
      </p>
      {!compact && <ViewerRealtime revision={revision} retry={retry} />}
      {!report ? (
        <ReportState error={state?.error} retry={retry} />
      ) : (
        <>
          <Ga4Notes report={report} />
          {report.data && (
            <>
              {report.data.partial && (
                <p role="status" className="text-sm text-padel-muted">
                  Partial report: GA4 withheld or grouped some rows. Shares use GA4 totals.
                </p>
              )}
              {report.data.totals.current.activeUsers === 0 &&
                report.data.totals.current.sessions === 0 &&
                report.data.totals.current.views === 0 && (
                  <p role="status">
                    No Viewer data reported for this period. Collection, consent coverage, and processing lag
                    can affect coverage.
                  </p>
                )}
              <Ga4Metrics totals={report.data.totals} compact={compact} />
              {compact ? (
                <Ga4SessionChart data={report.data} provisional={report.window?.provisional} />
              ) : (
                <ViewerBreakdown data={report.data} provisional={report.window?.provisional} />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
function ViewerRealtime({ revision, retry }: { revision: number; retry(): void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const state = useAdminReport<Ga4ReportEnvelope<Ga4ViewerRealtime>>(
    "/admin/ga4/viewer/realtime",
    revision + tick
  );
  const report = state?.data;
  const expired = report?.fetchedAt ? Date.now() - Date.parse(report.fetchedAt) > 120_000 : false;
  return (
    <section className="ga4-realtime rounded-xl p-4" aria-label="Viewer Realtime">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <h2 className="text-xs font-bold uppercase">● Realtime</h2>
        {report?.data && (
          <p>
            <strong className="mr-2 text-3xl tabular-nums">{count(report.data.activeUsers)}</strong>active
            users in the last 30 minutes
          </p>
        )}
        <p className="text-xs">GA4 Realtime · separate from the date filter</p>
      </div>
      {report ? (
        <Ga4Notes report={expired ? { ...report, stale: true } : report} />
      ) : (
        <ReportState error={state?.error} retry={retry} />
      )}
    </section>
  );
}
function ViewerBreakdown({ data, provisional }: { data: Ga4ViewerReport; provisional?: boolean }) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1.8fr_1fr]">
      <Ga4SessionChart data={data} provisional={provisional} />
      <section className="admin-panel">
        <div className="flex justify-between gap-2">
          <h2 className="text-lg font-bold">How viewers arrive</h2>
          <Ga4Badge />
        </div>
        <p className="mb-4 text-xs text-padel-muted">
          Sessions by default channel group · attribution may be limited
        </p>
        <ul className="grid gap-4 text-sm">
          {data.channels.map(({ channel, sessions }) => (
            <li key={channel}>
              <div className="flex justify-between gap-3">
                <span className="min-w-0 break-words font-semibold">{channel}</span>
                <span className="shrink-0 tabular-nums">
                  {count(sessions)} · {share(sessions, data.totals.current.sessions)}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded bg-padel-surface-alt" aria-hidden="true">
                <div
                  className="h-full rounded bg-(--admin-ga4)"
                  style={{
                    width: `${data.totals.current.sessions > 0 ? Math.min(100, (sessions / data.totals.current.sessions) * 100) : 0}%`
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
        {!data.channels.length && <p>No channel data reported.</p>}
      </section>
      <section className="admin-panel">
        <div className="flex justify-between gap-2">
          <h2 className="text-lg font-bold">Most viewed page types</h2>
          <Ga4Badge />
        </div>
        <p className="mb-4 text-xs text-padel-muted">Grouped by safe route label · share of GA4 page views</p>
        {data.pageTypes === null ? (
          <p>Page types unavailable. Check the GA4 page_type custom dimension.</p>
        ) : data.pageTypes.length === 0 ? (
          <p>No page-type data reported.</p>
        ) : (
          <ReportTable title="Viewer page types" columns={["Viewer page", "Views", "Share of views"]} compact>
            {data.pageTypes.map(({ page, views }) => (
              <tr key={page}>
                <Cell>{pageLabels[page]}</Cell>
                <Cell>{count(views)}</Cell>
                <Cell>{share(views, data.totals.current.views)}</Cell>
              </tr>
            ))}
          </ReportTable>
        )}
      </section>
      <section className="admin-panel">
        <div className="flex justify-between gap-2">
          <h2 className="text-lg font-bold">Device mix</h2>
          <Ga4Badge />
        </div>
        <p className="mb-5 text-xs text-padel-muted">Share of Viewer sessions · GA4 total</p>
        <div className="mb-5 flex h-4 gap-1 overflow-hidden rounded" aria-hidden="true">
          {data.devices.map(({ device, sessions }, index) => (
            <div
              key={device}
              className={`ga4-device ga4-device-${index % 4}`}
              style={{
                width: `${data.totals.current.sessions > 0 ? Math.min(100, (sessions / data.totals.current.sessions) * 100) : 0}%`
              }}
            />
          ))}
        </div>
        <ul className="grid gap-3 text-sm">
          {data.devices.map(({ device, sessions }, index) => (
            <li className="flex justify-between gap-3" key={device}>
              <span className="capitalize">
                <span className={`ga4-dot ga4-device ga4-device-${index % 4}`} />
                {device}
              </span>
              <span className="tabular-nums">
                {count(sessions)} · {share(sessions, data.totals.current.sessions)}
              </span>
            </li>
          ))}
        </ul>
        {!data.devices.length && <p>No device data reported.</p>}
      </section>
    </div>
  );
}

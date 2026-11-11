import type { Ga4OrganizerReport, Ga4ReportEnvelope } from "@padel/shared";
import { Link } from "react-router-dom";
import { adminLink, label } from "../../lib/admin/reportFilters";
import { comparison, count, featureLabels, organizerMilestones } from "../../lib/admin/ga4Presentation";
import { Cell, ReportState, ReportTable } from "./ReportParts";
import { Ga4Badge, Ga4DeviceMix, Ga4Notes } from "./Ga4Parts";
import { Ga4SessionChart } from "./Ga4SessionChart";
import { useAdminReport } from "./useAdminReport";

export function OrganizerUsage({ query, range, revision, retry }: {
  query: string;
  range: URLSearchParams;
  revision: number;
  retry(): void;
}) {
  const state = useAdminReport<Ga4ReportEnvelope<Ga4OrganizerReport>>(`/admin/ga4/organizer?${query}`, revision);
  const report = state?.data;
  const data = report?.data;
  return (
    <section className="grid gap-4" aria-label="Organizer web usage">
      <div className="ga4-realtime flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl p-4">
        <span className="rounded-2xl bg-(--admin-brand) px-3 py-1 text-[0.625rem] font-bold text-[#14221a]">GA4 / ORGANIZER WEB</span>
        <p><strong>Signed-in web usage</strong> · devices with Usage analytics enabled</p>
      </div>
      <p className="text-sm text-padel-muted">
        Consented Organizer web usage only; excludes native app usage and the public Viewer audience.
        These users are not organizer account totals. <Link to={adminLink("/admin/activity", range)}>Activity</Link> reports
        recorded account and tournament actions separately.
      </p>
      {!report ? <ReportState error={state?.error} retry={retry} /> : <>
        <Ga4Notes report={report} />
        {data && <>
          {data.partial && <p role="status" className="text-sm text-padel-muted">Partial report: GA4 withheld or grouped some rows. Device shares use GA4 totals.</p>}
          {data.totals.current.activeUsers === 0 && data.totals.current.sessions === 0 &&
            data.totals.current.views === 0 && data.milestones.every((point) => point.count === 0) && (
            <p role="status">No Organizer web data reported for this period. Consent coverage, collection, and processing lag can affect coverage.</p>
          )}
          <OrganizerMetrics data={data} />
          <div className="grid items-start gap-4 xl:grid-cols-[1.8fr_1fr]">
            <Ga4SessionChart data={data} provisional={report.window?.provisional} organizer />
            <FeatureAreas features={data.features} />
            <CreationMilestones data={data} range={range} />
            <Ga4DeviceMix devices={data.devices} sessions={data.totals.current.sessions} surface="Organizer web" />
          </div>
        </>}
      </>}
    </section>
  );
}

function OrganizerMetrics({ data }: { data: Ga4OrganizerReport }) {
  const started = data.milestones.find((point) => point.event === "creation_started")?.count ?? 0;
  const metrics = [
    ...([["Active web users", "activeUsers"], ["Sessions", "sessions"], ["Screen views", "views"]] as const).map(([title, key]) => ({
      title, value: data.totals.current[key], note: comparison(data.totals.current[key], data.totals.previous[key])
    })),
    { title: "Creation wizard starts", value: started, note: "Recorded events · repeats included" }
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {metrics.map(({ title, value, note }, index) => (
      <section className={`admin-panel ${index === 0 ? "ga4-organizer-primary" : ""}`} key={title}>
        <div className="flex items-center justify-between gap-2 text-sm font-semibold text-padel-muted"><h2>{title}</h2><Ga4Badge /></div>
        <p className="my-1 text-3xl font-bold tabular-nums">{count(value)}</p>
        <p className="text-xs text-padel-muted">{note}</p>
      </section>
    ))}
  </div>;
}

function FeatureAreas({ features }: { features: Ga4OrganizerReport["features"] }) {
  const ordered = features ? [...features].sort((a, b) => b.views - a.views) : [];
  const maximum = Math.max(1, ...ordered.map((point) => point.views));
  return <section className="admin-panel min-w-0">
    <div className="flex justify-between gap-2"><h2 className="text-lg font-bold">Most used features</h2><Ga4Badge /></div>
    <p className="mb-4 text-xs text-padel-muted">Screen views by safe feature area · bars relative to the most viewed feature</p>
    {features == null ? <p>Feature areas unavailable. Check the GA4 feature_area custom dimension and provider status.</p>
      : !features.length ? <p>No feature-area data reported.</p> : <>
        <ul className="grid gap-4 text-sm">
          {ordered.map(({ feature, views }) => <li key={feature}>
            <div className="flex justify-between gap-3"><span className="font-semibold">{featureLabels[feature] ?? "Other Organizer features"}</span><span className="tabular-nums">{count(views)}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-padel-surface-alt" aria-hidden="true"><div className="h-full rounded bg-(--admin-ga4)" style={{ width: `${Math.min(100, views / maximum * 100)}%` }} /></div>
          </li>)}
        </ul>
        <details className="mt-4 text-sm">
          <summary className="font-semibold text-padel-primary">View feature users and views</summary>
          <p className="my-2 text-xs text-padel-muted">Active users overlap between features; do not add these counts together.</p>
          <ReportTable title="Organizer feature usage" columns={["Feature", "Views", "Active users"]} compact>
            {ordered.map(({ feature, views, activeUsers }) => <tr key={feature}><Cell>{featureLabels[feature] ?? "Other Organizer features"}</Cell><Cell>{count(views)}</Cell><Cell>{count(activeUsers)}</Cell></tr>)}
          </ReportTable>
        </details>
      </>}
  </section>;
}

function CreationMilestones({ data, range }: { data: Ga4OrganizerReport; range: URLSearchParams }) {
  return <section className="admin-panel min-w-0">
    <div className="flex justify-between gap-2"><h2 className="text-lg font-bold">Tournament creation milestones</h2><Ga4Badge /></div>
    <p className="mb-4 text-xs text-padel-muted">Independent event counts, including repeated steps and retries. These are not an ordered funnel or completion rate.</p>
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {organizerMilestones(data).map((point) => <div className="rounded-lg bg-padel-surface-alt p-3" key={point.label}>
        <dt className="text-xs font-semibold text-padel-muted">{point.label}</dt>
        <dd className="mt-2 text-2xl font-bold tabular-nums">{point.count === null ? <span className="text-sm">Unavailable</span> : count(point.count)}</dd>
      </div>)}
    </dl>
    {data.creationSteps == null ? <p className="mt-3 text-sm text-padel-muted">Creation steps unavailable. Check the GA4 creation_step custom dimension and provider status.</p> : <details className="mt-3 text-sm">
      <summary className="font-semibold text-padel-primary">View all creation step counts</summary>
      <ReportTable title="Creation step event counts" columns={["Step", "Recorded events"]} compact>
        {data.creationSteps.map(({ step, count: value }) => <tr key={step}><Cell>{label(step)}</Cell><Cell>{count(value)}</Cell></tr>)}
      </ReportTable>
    </details>}
    <p className="mt-4 text-xs text-padel-muted">Actual tournament totals are reported from the app database in <Link to={adminLink("/admin", range)}>Overview</Link>.</p>
  </section>;
}

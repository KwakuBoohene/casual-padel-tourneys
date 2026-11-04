import { UsageOverview } from "./UsageOverview";
import { ActivityReport } from "./ActivityReport";
import { useState, type ReactNode } from "react";
import type {
  AdminOverview,
  AdminActivity,
  AdminReport,
  AdminReportPage,
  AdminUserDetail,
  AdminUserSummary,
  AdminTournamentDetail,
  AdminTournamentSummary
} from "@padel/shared";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { adminLink, rangeParams, reportQuery, timestamp, weekRange } from "../../lib/admin/reportFilters";
import { useAdminSession } from "./AdminSession";
import { useAdminReport } from "./useAdminReport";
import { AccountDetail, AccountList } from "./AccountReports";
import { TournamentDetail, TournamentList } from "./TournamentReports";
import { OverviewReport } from "./OverviewReport";
import { ReportFilters } from "./ReportFilters";
import { Coverage, Pager, ReportState } from "./ReportParts";
import "./admin.css";

export function AdminPage() {
  const session = useAdminSession();
  if (session.status === "signed-out") return <Navigate to="/admin/sign-in" replace />;
  return (
    <main className="admin-workspace min-h-screen bg-padel-background text-padel-text px-4 py-10 sm:px-6">
      <section className="max-w-6xl mx-auto space-y-6">
        <p className="text-padel-primary text-sm font-bold">CASUAL PADEL · ADMIN</p>
        {session.status === "allowed" ? (
          <Reports />
        ) : (
          <>
            <h1 className="text-3xl font-bold">
              {session.status === "checking" ? "Checking admin access…" : "Admin access unavailable"}
            </h1>
            {session.status === "denied" ? (
              <p role="alert">This account does not have active platform admin access.</p>
            ) : null}
            {session.status === "error" ? <ReportState error={0} retry={session.retry} /> : null}
          </>
        )}
        <footer className="flex flex-wrap items-center gap-6">
          <Link to="/">Back to the viewer</Link>
          <button onClick={session.signOut} className="admin-control">
            Sign out
          </button>
        </footer>
      </section>
    </main>
  );
}
function Reports() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [fallback] = useState(weekRange);
  const [revision, setRevision] = useState(0);
  const retry = () => setRevision((n) => n + 1);
  const match = /^\/admin(?:\/(users|tournaments|activity)(?:\/([A-Za-z0-9_-]{1,128}))?)?\/?$/.exec(pathname);
  const kind =
    match?.[1] === "activity"
      ? "activity"
      : match?.[1] === "users"
        ? "users"
        : match?.[1] === "tournaments"
          ? "tournaments"
          : "overview";
  const id = match?.[2];
  const range = rangeParams(params, fallback);
  const context = new URLSearchParams(params);
  range.forEach((value, key) => context.set(key, value));
  // The overview always compares a bounded interval; unbounded history is list-only.
  if (kind === "overview" && range.get("period") === "all")
    return <Navigate to={adminLink("/admin", fallback)} replace />;
  const query = reportQuery(kind, params, fallback);
  const path = `/admin/${kind}${id ? `/${id}` : `?${query}`}`;
  const title =
    kind === "overview"
      ? "Platform overview"
      : kind === "activity"
        ? "Observed activity"
        : kind === "users"
          ? id
            ? "Account details"
            : "Accounts"
          : id
            ? "Tournament details"
            : "Tournaments";
  const request = { path: query === null && !id ? null : path, revision, retry };
  return (
    <>
      <nav aria-label="Admin reports" className="flex flex-wrap gap-6">
        {[
          ["/admin", "Overview", "overview"],
          ["/admin/users", "Accounts", "users"],
          ["/admin/tournaments", "Tournaments", "tournaments"],
          ["/admin/activity", "Activity", "activity"]
        ].map(([to, text, section]) => (
          <Link
            key={to}
            aria-current={kind === section ? "page" : undefined}
            to={adminLink(to, section === "overview" && range.get("period") === "all" ? fallback : range)}
          >
            {text}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        <button className="admin-control" onClick={retry}>
          Refresh report
        </button>
      </div>
      {!match ? (
        <p role="alert">Admin page not found.</p>
      ) : (
        <>
          {id ? (
            <Link to={adminLink(`/admin/${kind}`, params)}>
              Back to {kind === "users" ? "accounts" : "tournaments"}
            </Link>
          ) : (
            <ReportFilters key={params.toString()} kind={kind} fallback={fallback} />
          )}
          <p className="text-sm text-padel-muted">
            {id
              ? "Details show all retained data for this record. List creation range: "
              : kind === "activity"
                ? "Activity range: "
                : "Creation range: "}
            {range.get("period") === "all"
              ? "All retained history"
              : `${timestamp(range.get("from"))} inclusive → ${timestamp(range.get("to"))} exclusive`}{" "}
            · Africa/Accra
          </p>
          {query === null && !id ? (
            <p role="alert">
              Invalid filters. Provide increasing dates, no more than 366 days apart, and supported filter
              values. Apply filters again to restart pagination.
            </p>
          ) : kind === "overview" ? (
            <ReportView<AdminReport<AdminOverview>> {...request}>
              {(report) => <OverviewReport data={report.data} range={range} />}
            </ReportView>
          ) : kind === "activity" ? (
            <ReportView<AdminReportPage<AdminActivity>> {...request}>
              {(report) => (
                <>
                  <ActivityReport data={report.data} range={range} />
                  <Pager nextCursor={report.nextCursor} params={context} />
                </>
              )}
            </ReportView>
          ) : kind === "users" ? (
            id ? (
              <ReportView<AdminReport<AdminUserDetail>> {...request}>
                {(report) => <AccountDetail data={report.data} range={range} />}
              </ReportView>
            ) : (
              <ReportView<AdminReportPage<AdminUserSummary>> {...request}>
                {(report) => (
                  <>
                    <AccountList data={report.data} range={context} />
                    <Pager nextCursor={report.nextCursor} params={context} />
                  </>
                )}
              </ReportView>
            )
          ) : id ? (
            <ReportView<AdminReport<AdminTournamentDetail>> {...request}>
              {(report) => <TournamentDetail data={report.data} range={range} />}
            </ReportView>
          ) : (
            <ReportView<AdminReportPage<AdminTournamentSummary>> {...request}>
              {(report) => (
                <>
                  <TournamentList data={report.data} range={context} />
                  <Pager nextCursor={report.nextCursor} params={context} />
                </>
              )}
            </ReportView>
          )}
          {kind === "overview" && query !== null ? <UsageOverview range={range} revision={revision} /> : null}
        </>
      )}
    </>
  );
}
function ReportView<T extends AdminReport<unknown>>({
  path,
  revision,
  retry,
  children
}: {
  path: string | null;
  revision: number;
  retry(): void;
  children(report: T): ReactNode;
}) {
  const state = useAdminReport<T>(path, revision);
  if (!state?.data) return <ReportState error={state?.error} retry={retry} />;
  return (
    <>
      <div role="status" className="sr-only">
        Report loaded
      </div>
      {children(state.data)}
      <Coverage coverage={state.data.coverage} />
    </>
  );
}

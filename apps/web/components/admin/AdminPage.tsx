import { AdminShell } from "./AdminShell";
import { UsageOverview } from "./UsageOverview";
import { ActivityReport } from "./ActivityReport";
import { useState, type ReactNode } from "react";
import type {
  AdminCoverage,
  AdminOverview,
  AdminActivity,
  AdminReport,
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
import { OverviewDateFilter, ReportFilters } from "./ReportFilters";
import { CoverageNotes, Pager, ReportState } from "./ReportParts";
import { ReportTooltip } from "./ReportTooltip";
import "./admin.css";

const reportTitle = "mt-[0.35rem] text-[clamp(1.875rem,3.1vw,2.75rem)] leading-[1.1] font-[750] tracking-tight";

export function AdminPage() {
  const session = useAdminSession();
  if (session.status === "signed-out") return <Navigate to="/admin/sign-in" replace />;
  if (session.status === "allowed") return <Reports signOut={session.signOut} />;
  return (
    <AdminShell signOut={session.signOut}>
      <h1 className={reportTitle}>
        {session.status === "checking" ? "Checking admin access…" : "Admin access unavailable"}
      </h1>
      {session.status === "denied" ? (
        <p role="alert">This account does not have active platform admin access.</p>
      ) : null}
      {session.status === "error" ? <ReportState error={0} retry={session.retry} /> : null}
    </AdminShell>
  );
}
function Reports({ signOut }: { signOut(): void }) {
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
  const byCompletion = kind === "tournaments" && params.get("dateBy") === "completed";
  const rangeLabel = {
    overview: "Reporting",
    activity: "Activity",
    users: "Creation",
    tournaments: byCompletion ? "Completion" : "Creation"
  }[kind];
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
  function frame(content: ReactNode, coverage?: AdminCoverage, notes?: ReactNode) {
    return (
      <>
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div>
            <p className="admin-eyebrow text-padel-primary">{kind === "overview" ? "Reporting snapshot" : "Platform reports"}</p>
            <div className="flex items-center gap-1">
              <h1 className={reportTitle}>{title}</h1>
              {match && (query !== null || id) ? (
                <ReportTooltip label="Report details">
                  <p>
                    {id ? `List ${rangeLabel.toLowerCase()} range: ` : `${rangeLabel} range: `}
                    {range.get("period") === "all"
                      ? "All retained history"
                      : `${timestamp(range.get("from"))} inclusive → ${timestamp(range.get("to"))} exclusive`}. Africa/Accra.
                  </p>
                  {id && <p>Details show all retained data for this record.</p>}
                  {notes}
                  {coverage && <CoverageNotes coverage={coverage} />}
                </ReportTooltip>
              ) : null}
            </div>
          </div>
          <div className="relative flex max-w-full flex-wrap items-center gap-2">
            {kind === "overview" && match ? <OverviewDateFilter fallback={fallback} range={range} /> : null}
            <button type="button" className="admin-control" onClick={retry}>Refresh report</button>
          </div>
        </header>
        {match && (id ? (
          <Link to={adminLink(`/admin/${kind}`, params)}>
            Back to {kind === "users" ? "accounts" : "tournaments"}
          </Link>
        ) : kind !== "overview" ? (
          <ReportFilters key={params.toString()} kind={kind} fallback={fallback} />
        ) : null)}
        {content}
        {kind === "overview" && match && query !== null ? <UsageOverview range={range} revision={revision} /> : null}
      </>
    );
  }

  function report<T>(content: (result: T) => ReactNode, notes?: (result: T) => ReactNode) {
    return <ReportView<T> {...request} frame={frame} notes={notes} params={context}>{content}</ReportView>;
  }

  let content: ReactNode;
  if (!match) content = frame(<p role="alert">Admin page not found.</p>);
  else if (query === null && !id) {
    content = frame(
      <p role="alert">
        Invalid filters. Provide increasing dates, no more than 366 days apart, and supported filter
        values. Apply filters again to restart pagination.
      </p>
    );
  } else if (kind === "overview") {
    content = report<AdminOverview>(
      (data) => <OverviewReport data={data} range={range} revision={revision} />,
      ({ range }) => (
        <p>
          Comparison: {timestamp(range.previousFrom)} inclusive → {timestamp(range.previousTo)} exclusive.
          {" "}Same duration as the selected range.
        </p>
      )
    );
  } else if (kind === "activity") {
    content = report<AdminActivity[]>((data) => <ActivityReport data={data} range={range} />);
  } else if (kind === "users") {
    content = id
      ? report<AdminUserDetail>((data) => <AccountDetail data={data} range={range} />)
      : report<AdminUserSummary[]>((data) => <AccountList data={data} range={context} />);
  } else {
    content = id
      ? report<AdminTournamentDetail>((data) => <TournamentDetail data={data} range={range} />)
      : report<AdminTournamentSummary[]>((data) => <TournamentList data={data} range={context} byCompletion={byCompletion} />);
  }

  return (
    <AdminShell navigation={{ kind, range, fallback }} signOut={signOut}>{content}</AdminShell>
  );
}
function ReportView<T>({ path, revision, retry, frame, notes, params, children }: {
  path: string | null;
  revision: number;
  retry(): void;
  frame(content: ReactNode, coverage?: AdminCoverage, notes?: ReactNode): ReactNode;
  notes?(data: T): ReactNode;
  params: URLSearchParams;
  children(data: T): ReactNode;
}) {
  const state = useAdminReport<AdminReport<T> & { nextCursor?: string | null }>(path, revision);
  if (!state?.data) return frame(<ReportState error={state?.error} retry={retry} />);
  const { data, coverage, nextCursor } = state.data;
  return frame(
    <>
      {children(data)}
      {nextCursor !== undefined && <Pager nextCursor={nextCursor} params={params} />}
    </>,
    coverage,
    notes?.(data)
  );
}

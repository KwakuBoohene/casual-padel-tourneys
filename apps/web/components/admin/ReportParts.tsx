import type { AdminCoverage } from "@padel/shared";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { timestamp } from "../../lib/admin/reportFilters";

export function Coverage({ coverage }: { coverage: AdminCoverage }) {
  return (
    <aside className="admin-panel text-sm text-padel-muted">
      <h2 className="font-semibold text-padel-text">
        {coverage.source === "observed-events"
          ? "Observed history · partial coverage"
          : "Partial history · retained records"}
      </h2>
      <ul className="list-disc pl-5 space-y-1">
        {coverage.limitations.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </aside>
  );
}
export function ReportState({ error, retry }: { error?: number; retry(): void }) {
  if (error === undefined) return <p role="status">Loading report…</p>;
  return (
    <div role="alert" className="admin-panel">
      <p>
        {error === 404
          ? "This record was not found. It may have been deleted."
          : error === 400
            ? "These filters or pagination are no longer valid. Apply filters again to restart."
            : "Could not load this report. Please try again."}
      </p>
      <button className="admin-control mt-3" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
export function ReportTable({
  title,
  columns,
  children
}: {
  title: string;
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto admin-panel" tabIndex={0} role="region" aria-label={title}>
      <table className="w-full text-left text-sm">
        <caption className="text-left font-semibold text-base mb-4">{title}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" className="pb-3 pr-6 whitespace-nowrap" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Cell({ children }: { children: ReactNode }) {
  return <td className="py-3 pr-6 border-t border-padel-border align-top">{children}</td>;
}
export function Fields({ values }: { values: Record<string, ReactNode> }) {
  return (
    <dl className="admin-panel grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(values).map(([name, value]) => (
        <div className="min-w-0 break-words" key={name}>
          <dt className="text-sm text-padel-muted">{name}</dt>
          <dd className="mt-1 font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Pager({ nextCursor, params }: { nextCursor: string | null; params: URLSearchParams }) {
  function page(cursor?: string) {
    const next = new URLSearchParams(params);
    next.delete("cursor");
    if (cursor) next.set("cursor", cursor);
    return `?${next}`;
  }
  return (
    <nav aria-label="Report pages" className="flex flex-wrap gap-4 items-center">
      <span className="text-sm text-padel-muted">Up to 25 records per page</span>
      {params.has("cursor") ? (
        <Link className="admin-control" to={page()}>
          First page
        </Link>
      ) : null}
      {nextCursor ? (
        <Link className="admin-control" to={page(nextCursor)}>
          Next page
        </Link>
      ) : (
        <span className="text-sm text-padel-muted">End of results</span>
      )}
    </nav>
  );
}
export { timestamp };

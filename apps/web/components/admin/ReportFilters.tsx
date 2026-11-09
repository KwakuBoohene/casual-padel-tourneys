import { useRef, useState } from "react";
import { ListFilters, Select } from "./ListFilters";
import { useSearchParams } from "react-router-dom";
import { changeReportRange, dateInput, rangeParams, weekRange } from "../../lib/admin/reportFilters";
import { AdminIcon } from "./AdminIcon";

const reportDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Accra"
});

export function OverviewDateFilter({ fallback, range }: { fallback: URLSearchParams; range: URLSearchParams }) {
  const picker = useRef<HTMLDetailsElement>(null);
  const from = Date.parse(range.get("from") ?? "");
  const to = Date.parse(range.get("to") ?? "");
  const label = to > from ? reportDateFormat.formatRange(from, to - 1) : "Edit dates";
  const close = () => {
    const details = picker.current;
    if (!details?.open) return;
    details.open = false;
    details.querySelector("summary")?.focus();
  };
  return (
    <details
      className="admin-date-picker"
      ref={picker}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <summary className="admin-control list-none gap-1.5">
        <AdminIcon name="calendar" />
        <span className="sr-only">Report dates: </span>
        {label}
        <AdminIcon name="chevron" />
      </summary>
      <ReportFilters
        kind="overview"
        fallback={fallback}
        onApply={close}
        className="absolute start-0 top-[calc(100%+0.5rem)] z-5 w-[min(28rem,calc(100vw-2rem))] [box-shadow:0_8px_24px_#0002] md:start-auto md:end-0"
      />
    </details>
  );
}

export function ReportFilters({
  kind,
  fallback,
  onApply,
  className = ""
}: {
  kind: "overview" | "users" | "tournaments" | "activity";
  fallback: URLSearchParams;
  onApply?(): void;
  className?: string;
}) {
  const [params, setParams] = useSearchParams();
  const range = rangeParams(params, fallback);
  const [allHistory, setAllHistory] = useState(range.get("period") === "all");
  return (
    <form
      key={params.toString()}
      className={`admin-panel flex flex-wrap items-end gap-4 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const next = new URLSearchParams();
        if (data.get("period") === "all") next.set("period", "all");
        else
          for (const field of ["from", "to"]) {
            const value = String(data.get(field));
            if (!value || !Number.isFinite(Date.parse(`${value}Z`))) return;
            next.set(field, new Date(`${value}Z`).toISOString());
          }
        for (const field of [
          "actorUserId",
          "kind",
          "q",
          "accountType",
          "verification",
          "ownerId",
          "mode",
          "variant",
          "status",
          "sort"
        ]) {
          const value = data.get(field)?.toString().trim();
          if (value) next.set(field, value);
        }
        setParams(next);
        onApply?.();
      }}
    >
      {kind !== "overview" ? (
        <Select
          name="period"
          title={kind === "activity" ? "Activity range" : "Creation range"}
          value={range.get("period") ?? "range"}
          onChange={(value) => setAllHistory(value === "all")}
          options={[
            ["range", "Selected dates"],
            ["all", "All retained history"]
          ]}
        />
      ) : null}
      <label>
        From · inclusive (Accra)
        <input
          className="admin-control"
          name="from"
          type="datetime-local"
          required={!allHistory}
          disabled={allHistory}
          step="0.001"
          defaultValue={dateInput(range.get("from") ?? fallback.get("from")!)}
        />
      </label>
      <label>
        To · exclusive (Accra)
        <input
          className="admin-control"
          name="to"
          type="datetime-local"
          required={!allHistory}
          disabled={allHistory}
          step="0.001"
          defaultValue={dateInput(range.get("to") ?? fallback.get("to")!)}
        />
      </label>
      <ListFilters kind={kind} params={params} />
      {kind !== "overview" && kind !== "activity" ? (
        <Select
          name="sort"
          title="Creation order"
          value={params.get("sort") ?? "newest"}
          options={[
            ["newest", "Newest first"],
            ["oldest", "Oldest first"]
          ]}
        />
      ) : null}
      <button className="admin-control font-semibold">Apply filters</button>
      <button
        type="button"
        className="admin-control"
        onClick={() => {
          setParams(changeReportRange(params, weekRange()));
          onApply?.();
        }}
      >
        This week
      </button>
    </form>
  );
}

import { useState } from "react";
import { ListFilters, Select } from "./ListFilters";
import { useSearchParams } from "react-router-dom";
import { dateInput, rangeParams, weekRange } from "../../lib/admin/reportFilters";

export function ReportFilters({
  kind,
  fallback
}: {
  kind: "overview" | "users" | "tournaments";
  fallback: URLSearchParams;
}) {
  const [params, setParams] = useSearchParams();
  const range = rangeParams(params, fallback);
  const [allHistory, setAllHistory] = useState(range.get("period") === "all");
  return (
    <form
      key={params.toString()}
      className="admin-panel flex flex-wrap items-end gap-4"
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
      }}
    >
      {kind !== "overview" ? (
        <Select
          name="period"
          title="Creation range"
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
      {kind !== "overview" ? (
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
      <button type="button" className="admin-control" onClick={() => setParams(weekRange())}>
        This week
      </button>
    </form>
  );
}

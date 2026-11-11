import {
  adminOverviewQuerySchema,
  adminUsersQuerySchema,
  adminTournamentsQuerySchema,
  usageActivityQuerySchema
} from "@padel/shared";

export function weekRange(now = new Date()): URLSearchParams {
  const from = new Date(now);
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - ((from.getUTCDay() + 6) % 7));
  return new URLSearchParams({
    from: from.toISOString(),
    to: new Date(Math.max(now.getTime(), from.getTime() + 1000)).toISOString()
  });
}
export function rangeParams(params: URLSearchParams, fallback: URLSearchParams): URLSearchParams {
  if (params.get("period") === "all") return new URLSearchParams({ period: "all" });
  return new URLSearchParams({
    from: params.get("from") ?? fallback.get("from")!,
    to: params.get("to") ?? fallback.get("to")!
  });
}
export function adminLink(path: string, params: URLSearchParams, extra: Record<string, string> = {}): string {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(extra)) next.set(key, value);
  return `${path}?${next}`;
}
export function reportQuery(
  kind: "overview" | "users" | "tournaments" | "activity",
  params: URLSearchParams,
  fallback: URLSearchParams
): string | null {
  const query = rangeParams(params, fallback);
  query.delete("period");
  const fields =
    kind === "users"
      ? ["q", "accountType", "verification", "sort", "cursor"]
      : kind === "tournaments"
        ? ["dateBy", "ownerId", "mode", "variant", "status", "sort", "cursor"]
        : kind === "activity"
          ? ["actorUserId", "ownerId", "kind", "cursor"]
          : [];
  for (const field of fields) if (params.get(field)) query.set(field, params.get(field)!);
  if (kind !== "overview") query.set("limit", "25");
  const schema =
    kind === "users"
      ? adminUsersQuerySchema
      : kind === "tournaments"
        ? adminTournamentsQuerySchema
        : kind === "activity"
          ? usageActivityQuerySchema
          : adminOverviewQuerySchema;
  return schema.safeParse(Object.fromEntries(query)).success ? query.toString() : null;
}
export function dateInput(value: string): string {
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString().slice(0, -1) : "";
}
export function timestamp(value: string | null): string {
  if (!value) return "Not yet observed";
  const date = dateInput(value);
  return date ? date.replace("T", " ") + " UTC" : "Invalid date";
}
export function label(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replaceAll("-", " ");
}

export function changeReportRange(params: URLSearchParams, range: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete("cursor");
  next.delete("period");
  range.forEach((value, key) => next.set(key, value));
  return next;
}

import { createHash } from "node:crypto";
import type { AdminCoverage } from "@padel/shared";
import { validation } from "../../../shared/kernel/appError.js";

export const reportCoverage: AdminCoverage = {
  source: "retained-records",
  historyComplete: false,
  unavailable: ["visits", "activeUsers", "lastActivity"],
  limitations: [
    "Deleted records are not reconstructed.",
    "Guest/registered counts reflect current account classification, not immutable signup history.",
    "Activity counts cover retained organizer audit entries only; ownership and performed actions are distinct.",
    "Visits, active users and last activity have not been instrumented."
  ]
};
export function reportingRange(input: { from?: string; to?: string }, now = new Date()) {
  const monday = new Date(now);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const from = input.from ? new Date(input.from) : monday;
  const to = input.to ? new Date(input.to) : now;
  return {
    from,
    to,
    previousFrom: new Date(from.getTime() - (to.getTime() - from.getTime())),
    previousTo: from
  };
}
export interface PageQuery {
  from?: string;
  to?: string;
  limit: number;
  cursor?: string;
  sort: "newest" | "oldest";
}
function fingerprint(kind: string, query: PageQuery) {
  const filters = Object.fromEntries(
    Object.entries(query).filter(([key]) => !["cursor", "limit"].includes(key))
  );
  return createHash("sha256")
    .update(JSON.stringify([kind, filters]))
    .digest("hex");
}
export function pageBoundary(kind: string, query: PageQuery) {
  if (!query.cursor) return {};
  try {
    const cursor = JSON.parse(Buffer.from(query.cursor, "base64url").toString()) as {
      id: string;
      at: string;
      filter: string;
    };
    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(cursor.id) ||
      !/^\d{4}-\d\d-\d\dT/.test(cursor.at) ||
      !Number.isFinite(Date.parse(cursor.at)) ||
      new Date(cursor.at).toISOString() !== cursor.at ||
      cursor.filter !== fingerprint(kind, query)
    )
      throw new Error();
    const operator = query.sort === "newest" ? "lt" : "gt";
    return {
      OR: [
        { createdAt: { [operator]: new Date(cursor.at) } },
        { createdAt: new Date(cursor.at), id: { [operator]: cursor.id } }
      ]
    };
  } catch {
    throw validation("Invalid cursor for these filters.");
  }
}
export function nextPageCursor(
  kind: string,
  query: PageQuery,
  row: { id: string; createdAt: Date } | undefined
) {
  return row
    ? Buffer.from(
        JSON.stringify({ id: row.id, at: row.createdAt.toISOString(), filter: fingerprint(kind, query) })
      ).toString("base64url")
    : null;
}
export function createdIn(query: { from?: string; to?: string }) {
  return query.from && query.to ? { gte: new Date(query.from), lt: new Date(query.to) } : undefined;
}

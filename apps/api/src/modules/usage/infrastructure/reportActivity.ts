import { createHash } from "node:crypto";
import type { AdminActivity, AdminReportPage, UsageActivityQuery } from "@padel/shared";
import { prisma } from "../../../lib/prisma.js";
import { validation } from "../../../shared/kernel/appError.js";
import { usageCoverage } from "./coverage.js";
import { USAGE_RAW_DAYS } from "@padel/shared";

export async function reportActivity(query: UsageActivityQuery): Promise<AdminReportPage<AdminActivity>> {
  const { cursor, limit, ...filters } = query;
  const fingerprint = createHash("sha256").update(JSON.stringify(filters)).digest("hex");
  let boundary: { at: Date; id: string } | null = null;
  if (cursor) {
    try {
      const row = JSON.parse(Buffer.from(cursor, "base64url").toString()) as {
        at: string;
        id: string;
        filter: string;
      };
      if (
        row.filter !== fingerprint ||
        !/^[A-Za-z0-9:_-]{1,256}$/.test(row.id) ||
        new Date(row.at).toISOString() !== row.at
      )
        throw new Error();
      boundary = { at: new Date(row.at), id: row.id };
    } catch {
      throw validation("Invalid activity cursor for these filters.");
    }
  }
  const rows = await prisma.usageEvent.findMany({
    where: {
      actorUserId: query.actorUserId,
      ownerId: query.ownerId,
      kind: query.kind,
      occurredAt: {
        ...(query.from
          ? { gte: new Date(Math.max(Date.parse(query.from), Date.now() - USAGE_RAW_DAYS * 86_400_000)) }
          : { gte: new Date(Date.now() - USAGE_RAW_DAYS * 86_400_000) }),
        ...(query.to ? { lt: new Date(query.to) } : {})
      },
      ...(boundary
        ? { OR: [{ occurredAt: { lt: boundary.at } }, { occurredAt: boundary.at, id: { lt: boundary.id } }] }
        : {})
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: limit + 1
  });
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const coverage = usageCoverage;
  return {
    data: page.map((row) => ({
      id: row.id,
      occurredAt: row.occurredAt.toISOString(),
      kind: row.kind,
      surface: row.surface,
      route: row.route,
      actorUserId: row.actorUserId,
      ownerId: row.ownerId,
      targetId: row.targetId,
      action: row.action
    })),
    coverage,
    nextCursor:
      rows.length > limit && last
        ? Buffer.from(
            JSON.stringify({ at: last.occurredAt.toISOString(), id: last.id, filter: fingerprint })
          ).toString("base64url")
        : null
  };
}
export async function lastObservedActivity(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await prisma.usageEvent.groupBy({
    by: ["actorUserId"],
    where: {
      actorUserId: { in: ids },
      occurredAt: { gte: new Date(Date.now() - USAGE_RAW_DAYS * 86_400_000) },
      kind: { not: "account.created" }
    },
    _max: { occurredAt: true }
  });
  return new Map(
    rows.flatMap((row) =>
      row.actorUserId && row._max.occurredAt
        ? [[row.actorUserId, row._max.occurredAt.toISOString()] as const]
        : []
    )
  );
}

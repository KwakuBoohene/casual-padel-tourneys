import { usageCoverage } from "./coverage.js";
import { USAGE_RAW_DAYS, type AdminReport, type AdminUsage, type UsageCounts } from "@padel/shared";
import { prisma } from "../../../lib/prisma.js";
import { reportingRange } from "../../admin/domain/reporting.js";
import { usageEnabled } from "../domain/policy.js";

export async function reportUsage(
  input: { from?: string; to?: string },
  now = new Date()
): Promise<AdminReport<AdminUsage>> {
  const range = reportingRange(input, now);
  const rawFrom = new Date(now.getTime() - USAGE_RAW_DAYS * 86_400_000);
  const collecting = { visits: usageEnabled("visits"), business: usageEnabled("business") };
  return prisma.$transaction(
    async (tx) => {
      const markers = await tx.usageCoverage.findMany();
      const start = (source: string) => markers.find((row) => row.source === source)?.startedAt ?? null;
      const count = async (from: Date, to: Date): Promise<UsageCounts> => {
        const observedFrom = new Date(Math.max(from.getTime(), rawFrom.getTime()));
        const where = { occurredAt: { gte: observedFrom, lt: to } };
        const ready = (source: "visits" | "business") =>
          start(source) !== null && to > start(source)! && to > rawFrom;
        const [visits, logins, accountsCreated, tournamentsCreated, actors] = await Promise.all([
          tx.usageEvent.count({ where: { ...where, kind: "visit" } }),
          tx.usageEvent.count({ where: { ...where, kind: "login" } }),
          tx.usageEvent.count({ where: { ...where, kind: "account.created" } }),
          tx.usageEvent.count({ where: { ...where, kind: "tournament.created" } }),
          tx.$queryRaw<
            { count: bigint }[]
          >`SELECT COUNT(DISTINCT "actorUserId") AS count FROM "UsageEvent" WHERE "occurredAt" >= ${observedFrom} AND "occurredAt" < ${to} AND "kind" <> 'account.created'`
        ]);
        return {
          partial: true,
          visits: ready("visits") ? visits : null,
          logins: ready("business") ? logins : null,
          accountsCreated: ready("business") ? accountsCreated : null,
          tournamentsCreated: ready("business") ? tournamentsCreated : null,
          activeUsers: ready("visits") || ready("business") ? Number(actors[0].count) : null
        };
      };
      const [current, previous, days] = await Promise.all([
        count(range.from, range.to),
        count(range.previousFrom, range.previousTo),
        tx.usageDay.findMany({
          where: {
            day: { gte: new Date(range.from.toISOString().slice(0, 10)), lt: range.to },
            kind: "visit",
            surface: "organizer"
          },
          orderBy: { day: "asc" }
        })
      ]);
      return {
        coverage: usageCoverage,
        data: {
          range: {
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            previousFrom: range.previousFrom.toISOString(),
            previousTo: range.previousTo.toISOString(),
            timezone: "Africa/Accra"
          },
          collecting,
          starts: {
            visits: start("visits")?.toISOString() ?? null,
            business: start("business")?.toISOString() ?? null
          },
          rawAvailableFrom: rawFrom.toISOString(),
          current,
          previous,
          daily: days.map((day) => ({ date: day.day.toISOString().slice(0, 10), visits: day.count }))
        }
      };
    },
    { isolationLevel: "RepeatableRead" }
  );
}

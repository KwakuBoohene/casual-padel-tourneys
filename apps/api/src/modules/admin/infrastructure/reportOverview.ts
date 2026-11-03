import type { AdminOverview, AdminPeriodCounts, AdminReport } from "@padel/shared";
import { prisma } from "../../../lib/prisma.js";
import { reportCoverage, reportingRange } from "../domain/reporting.js";

export async function reportOverview(input: {
  from?: string;
  to?: string;
}): Promise<AdminReport<AdminOverview>> {
  const range = reportingRange(input);
  return prisma.$transaction(
    async (tx) => {
      const counts = async (from: Date, to: Date): Promise<AdminPeriodCounts> => {
        const createdAt = { gte: from, lt: to };
        const [registeredAccountsCreated, guestAccountsCreated, tournamentsCreated] = await Promise.all([
          tx.user.count({ where: { createdAt, isGuest: false } }),
          tx.user.count({ where: { createdAt, isGuest: true } }),
          tx.tournament.count({ where: { createdAt } })
        ]);
        return {
          registeredAccountsCreated,
          guestAccountsCreated,
          tournamentsCreated,
          visits: null,
          activeUsers: null
        };
      };
      const [current, previous, registered, guests, groups, days] = await Promise.all([
        counts(range.from, range.to),
        counts(range.previousFrom, range.previousTo),
        tx.user.count({ where: { isGuest: false } }),
        tx.user.count({ where: { isGuest: true } }),
        tx.tournament.groupBy({
          by: ["mode", "variant"],
          where: { createdAt: { gte: range.from, lt: range.to } },
          _count: { _all: true },
          orderBy: [{ mode: "asc" }, { variant: "asc" }]
        }),
        tx.$queryRaw<{ day: Date; registered: bigint; guests: bigint; tournaments: bigint }[]>`
        SELECT day, SUM(registered)::bigint AS registered, SUM(guests)::bigint AS guests, SUM(tournaments)::bigint AS tournaments FROM (
          SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) FILTER (WHERE NOT "isGuest") AS registered,
            COUNT(*) FILTER (WHERE "isGuest") AS guests, 0::bigint AS tournaments
          FROM "User" WHERE "createdAt" >= ${range.from} AND "createdAt" < ${range.to} GROUP BY 1
          UNION ALL
          SELECT DATE_TRUNC('day', "createdAt"), 0::bigint, 0::bigint, COUNT(*)
          FROM "Tournament" WHERE "createdAt" >= ${range.from} AND "createdAt" < ${range.to} GROUP BY 1
        ) events GROUP BY day ORDER BY day`
      ]);
      const daily: AdminOverview["daily"] = [];
      const byDay = new Map(days.map((day) => [day.day.toISOString().slice(0, 10), day]));
      const cursor = new Date(range.from);
      cursor.setUTCHours(0, 0, 0, 0);
      while (cursor < range.to) {
        const date = cursor.toISOString().slice(0, 10);
        const row = byDay.get(date);
        daily.push({
          date,
          registeredAccountsCreated: Number(row?.registered ?? 0),
          guestAccountsCreated: Number(row?.guests ?? 0),
          tournamentsCreated: Number(row?.tournaments ?? 0)
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return {
        coverage: reportCoverage,
        data: {
          range: {
            from: range.from.toISOString(),
            to: range.to.toISOString(),
            previousFrom: range.previousFrom.toISOString(),
            previousTo: range.previousTo.toISOString(),
            timezone: "Africa/Accra"
          },
          accounts: { registered, guests, total: registered + guests },
          current,
          previous,
          daily,
          tournamentsByModeVariant: groups.map((group) => ({
            mode: group.mode,
            variant: group.variant,
            count: group._count._all
          }))
        }
      };
    },
    { isolationLevel: "RepeatableRead" }
  );
}

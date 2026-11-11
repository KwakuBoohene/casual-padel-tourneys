import { lastObservedActivity } from "../../usage/infrastructure/reportActivity.js";
import type { Prisma } from "@prisma/client";
import type { AdminUsersQuery, AdminTournamentsQuery } from "@padel/shared";
import { prisma } from "../../../lib/prisma.js";
import { notFound } from "../../../shared/kernel/appError.js";
import type { AdminReports } from "../application/reports.js";
import { dateRangeFilter, nextPageCursor, pageBoundary, reportCoverage } from "../domain/reporting.js";
import {
  userSelect,
  tournamentSelect,
  userSummary,
  tournamentSummary,
  startedTournament
} from "./reportSelections.js";
import { reportOverview } from "./reportOverview.js";

export class PrismaAdminReports implements AdminReports {
  overview = reportOverview;
  async users(query: AdminUsersQuery) {
    const q = query.q?.replace(/[\\%_]/g, "\\$&");
    const where: Prisma.UserWhereInput = {
      AND: [
        { createdAt: dateRangeFilter(query) },
        pageBoundary("users", query),
        ...(query.accountType ? [{ isGuest: query.accountType === "guest" }] : []),
        ...(query.verification === "verified"
          ? [{ isGuest: false, emailVerifiedAt: { not: null } }]
          : query.verification === "unverified"
            ? [{ OR: [{ isGuest: true }, { emailVerifiedAt: null }] }]
            : []),
        ...(q
          ? [
              {
                OR: [
                  { id: query.q },
                  { name: { contains: q, mode: "insensitive" as const } },
                  { email: { contains: q, mode: "insensitive" as const } }
                ]
              }
            ]
          : [])
      ]
    };
    const direction = query.sort === "newest" ? "desc" : "asc";
    const rows = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ createdAt: direction }, { id: direction }],
      take: query.limit + 1
    });
    const more = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const activity = await lastObservedActivity(page.map((row) => row.id));
    const last = page.at(-1);
    return {
      coverage: reportCoverage,
      data: page.map((row) => ({ ...userSummary(row), lastActivityAt: activity.get(row.id) ?? null })),
      nextCursor: more && last ? nextPageCursor("users", query, { id: last.id, at: last.createdAt }) : null
    };
  }
  async user(id: string) {
    const row = await prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!row) throw notFound("Account not found.");
    const performedActivityCount = await prisma.organizerActivity.count({ where: { actorUserId: id } });
    const activity = await lastObservedActivity([id]);
    return {
      coverage: reportCoverage,
      data: { ...userSummary(row), lastActivityAt: activity.get(id) ?? null, performedActivityCount }
    };
  }
  async tournaments(query: AdminTournamentsQuery) {
    const dateField = query.dateBy === "completed" ? "endedAt" : "createdAt";
    const dateRange = dateRangeFilter(query);
    const status: Prisma.TournamentWhereInput =
      query.status === "completed"
        ? { endedAt: { not: null } }
        : query.status === "in-progress"
          ? { endedAt: null, AND: [startedTournament] }
          : query.status === "not-started"
            ? { endedAt: null, NOT: startedTournament }
            : {};
    const where: Prisma.TournamentWhereInput = {
      [dateField]: dateField === "endedAt" ? { ...dateRange, not: null } : dateRange,
      organizerId: query.ownerId,
      mode: query.mode,
      variant: query.variant,
      AND: [status, pageBoundary("tournaments", query, dateField)]
    };
    const direction = query.sort === "newest" ? "desc" : "asc";
    const rows = await prisma.tournament.findMany({
      where,
      select: tournamentSelect,
      orderBy: [{ [dateField]: direction }, { id: direction }],
      take: query.limit + 1
    });
    const more = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const started = await this.startedIds(page.map((row) => row.id));
    const last = page.at(-1);
    const lastDate = last?.[dateField];
    return {
      coverage: reportCoverage,
      data: page.map((row) => tournamentSummary(row, started.has(row.id))),
      nextCursor:
        more && last && lastDate ? nextPageCursor("tournaments", query, { id: last.id, at: lastDate }) : null
    };
  }
  private async startedIds(ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const rows = await prisma.tournament.findMany({
      where: { id: { in: ids }, endedAt: null, AND: [startedTournament] },
      select: { id: true }
    });
    return new Set(rows.map((row) => row.id));
  }
  async tournament(id: string) {
    const row = await prisma.tournament.findUnique({ where: { id }, select: tournamentSelect });
    if (!row) throw notFound("Tournament not found.");
    const started = await this.startedIds([id]);
    const [recorded, completed, voided] = await Promise.all(
      [{}, { completed: true, voidedAt: null }, { voidedAt: { not: null } }].map(async (filter) => {
        const [normal, koh] = await Promise.all([
          prisma.match.count({ where: { ...filter, round: { tournamentId: id } } }),
          prisma.kohMatch.count({ where: { ...filter, court: { tournamentId: id } } })
        ]);
        return normal + koh;
      })
    );
    return {
      coverage: reportCoverage,
      data: { ...tournamentSummary(row, started.has(id)), matchCounts: { recorded, completed, voided } }
    };
  }
}

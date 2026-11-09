import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { prisma } from "../../../src/lib/prisma.js";
import { signAuthToken } from "../../../src/lib/auth.js";
import { registerAdminModule } from "../../../src/modules/admin/http/register.js";
import { registerAppErrorHandler } from "../../../src/shared/http/errorHandler.js";
import { reportingRange, nextPageCursor, pageBoundary } from "../../../src/modules/admin/domain/reporting.js";
import { redactUrl } from "../../../src/shared/http/requestContext.js";

const profile = (id: string) => ({
  id,
  email: `${id}@example.test`,
  name: "Report account",
  isGuest: false,
  emailVerifiedAt: new Date()
});
test("Accra week-to-date and cursor boundaries preserve equal duration and filter identity", () => {
  const range = reportingRange({}, new Date("2026-11-03T12:00:00Z"));
  assert.equal(range.from.toISOString(), "2026-11-02T00:00:00.000Z");
  assert.equal(range.previousFrom.toISOString(), "2026-10-31T12:00:00.000Z");
  assert.equal(
    range.previousTo.getTime() - range.previousFrom.getTime(),
    range.to.getTime() - range.from.getTime()
  );
  assert.equal(reportingRange({}, new Date("2026-11-08T23:59:00Z")).from.getTime(), range.from.getTime());
  const query = { limit: 2, sort: "newest" as const };
  const cursor = nextPageCursor("users", query, { id: "row", at: range.from });
  assert.ok(pageBoundary("users", { ...query, cursor }).OR);
  assert.throws(() => pageBoundary("users", { ...query, sort: "oldest", cursor }));
  assert.throws(() => pageBoundary("tournaments", { ...query, cursor }));
  assert.equal(redactUrl("/admin/users?q=private%40example.test&cursor=private"), "/admin/users");
});

test("every reporting route inherits auth, flag, grant checks and no-store before reading data", async () => {
  const oldSecret = process.env.JWT_SECRET,
    oldFlag = process.env.ADMIN_PORTAL_ENABLED;
  process.env.JWT_SECRET = "report-route-fixture";
  process.env.ADMIN_PORTAL_ENABLED = "true";
  const app = Fastify();
  registerAppErrorHandler(app);
  registerAdminModule(app, {
    isAdmin: async () => false,
    recordRead: async () => assert.fail("denied reads are not audited as permitted")
  });
  try {
    for (const url of [
      "/admin/overview",
      "/admin/users",
      "/admin/users/unknown",
      "/admin/tournaments",
      "/admin/tournaments/unknown"
    ]) {
      for (const headers of [{}, { authorization: `Bearer ${signAuthToken(profile("ordinary"))}` }]) {
        const response = await app.inject({ url, headers });
        assert.equal(response.statusCode, "authorization" in headers ? 403 : 401);
        assert.equal(response.headers["cache-control"], "no-store");
      }
    }
  } finally {
    await app.close();
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
    if (oldFlag === undefined) delete process.env.ADMIN_PORTAL_ENABLED;
    else process.env.ADMIN_PORTAL_ENABLED = oldFlag;
  }
});

test(
  "retained-data reports handle ties, boundaries, owners/actors, KOH progress and secret-free DTOs",
  { skip: process.env.ADMIN_DB_TESTS !== "true" },
  async () => {
    const prefix = `report-${randomUUID()}`;
    const ids = ["admin", "owner", "manager", "guest", "previous", "boundary"].map(
      (part) => `${prefix}-${part}`
    );
    const [adminId, ownerId, managerId, guestId] = ids;
    const from = "2035-01-08T00:00:00Z",
      to = "2035-01-09T00:00:00Z";
    const createdAt = new Date("2035-01-08T01:00:00Z");
    const oldSecret = process.env.JWT_SECRET,
      oldFlag = process.env.ADMIN_PORTAL_ENABLED;
    process.env.JWT_SECRET = "report-db-fixture";
    process.env.ADMIN_PORTAL_ENABLED = "true";
    const app = Fastify();
    registerAppErrorHandler(app);
    registerAdminModule(app);
    const headers = { authorization: `Bearer ${signAuthToken(profile(adminId))}` };
    const query = (extra: Record<string, string> = {}) =>
      new URLSearchParams({ from, to, ...extra }).toString();
    async function get(url: string, status = 200) {
      const response = await app.inject({ url, headers });
      assert.equal(response.statusCode, status, response.body);
      assert.equal(response.headers["cache-control"], "no-store");
      assert.ok(!response.body.includes("SECRET"));
      return response.json();
    }
    try {
      await prisma.user.createMany({
        data: ids.map((id, i) => ({
          ...profile(id),
          createdAt: i === 4 ? new Date("2035-01-07T00:00:00Z") : i === 5 ? new Date(to) : createdAt,
          isGuest: id === guestId,
          guestId: id === guestId ? `${prefix}-SECRET-GUEST` : null,
          googleId: `${id}-SECRET-GOOGLE`,
          careerShareToken: `${id}-SECRET-CAREER`
        }))
      });
      await prisma.platformAdminGrant.create({ data: { userId: adminId } });
      await prisma.opaqueRecord.create({ data: { userId: ownerId, envelope: "SECRET-ENVELOPE" } });
      await prisma.organizerMembership.create({ data: { organizerId: ownerId, memberUserId: managerId } });
      await prisma.organizerActivity.create({
        data: {
          organizerId: ownerId,
          actorUserId: managerId,
          actorName: "Manager",
          action: "TOURNAMENT_CREATED"
        }
      });
      const tournaments = ["closed", "scored", "koh", "waiting", "void", "previous", "boundary"].map(
        (part) => `${prefix}-${part}`
      );
      await prisma.tournament.createMany({
        data: tournaments.map((id, i) => ({
          id,
          name: "Report tournament",
          organizerId: ownerId,
          mode: i === 2 ? "KING_OF_THE_COURT" : i === 1 ? "MEXICANO" : "AMERICANO",
          variant: "CLASSIC",
          courts: 1,
          pointsPerMatch: 24,
          publicToken: `${id}-SECRET-PUBLIC`,
          createdAt: i === 5 ? new Date("2035-01-07T01:00:00Z") : i === 6 ? new Date(to) : createdAt,
          endedAt: i === 0 ? createdAt : i === 5 ? new Date(from) : i === 6 ? new Date(to) : null
        }))
      });
      for (const index of [1, 4])
        await prisma.round.create({
          data: {
            tournamentId: tournaments[index],
            roundNumber: 1,
            matches: {
              create: {
                court: 1,
                teamA: ["a"],
                teamB: ["b"],
                scoreA: 0,
                scoreB: 0,
                voidedAt: index === 4 ? createdAt : null
              }
            }
          }
        });
      const court = await prisma.kohCourt.create({ data: { tournamentId: tournaments[2], courtNumber: 1 } });
      const players = await Promise.all(
        [0, 1, 2, 3].map((i) =>
          prisma.player.create({ data: { tournamentId: tournaments[2], name: `Roster ${i}` } })
        )
      );
      const units = await Promise.all(
        [0, 1].map((i) =>
          prisma.kohUnit.create({
            data: {
              courtId: court.id,
              playerAId: players[2 * i].id,
              playerBId: players[2 * i + 1].id,
              queuePosition: i
            }
          })
        )
      );
      await prisma.kohMatch.create({
        data: {
          courtId: court.id,
          unitAId: units[0].id,
          unitBId: units[1].id,
          sets: { create: { setNumber: 1, gamesA: 1, gamesB: 0, winMethodsA: [], winMethodsB: [] } }
        }
      });
      const overview = (await get(`/admin/overview?${query()}`)).data;
      assert.equal(overview.current.registeredAccountsCreated, 3);
      assert.equal(overview.current.guestAccountsCreated, 1);
      assert.equal(overview.current.tournamentsCreated, 5);
      assert.equal(overview.current.tournamentsCompleted, 2);
      assert.equal(overview.daily[0].tournamentsCompleted, 2);
      assert.equal(overview.previous.registeredAccountsCreated, 1);
      assert.equal(overview.previous.tournamentsCreated, 1);
      assert.equal(overview.previous.tournamentsCompleted, 0);
      assert.equal(overview.current.visits, null);
      assert.equal(
        overview.daily.reduce(
          (n: number, day: { tournamentsCreated: number }) => n + day.tournamentsCreated,
          0
        ),
        5
      );
      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const page = await get(
          `/admin/users?${query({ q: prefix, limit: "2", ...(cursor ? { cursor } : {}) })}`
        );
        seen.push(...page.data.map((row: { id: string }) => row.id));
        cursor = page.nextCursor;
      } while (cursor);
      assert.equal(new Set(seen).size, 4);
      assert.equal(seen.length, 4);
      const oldest = await get(`/admin/users?${query({ q: prefix, limit: "2", sort: "oldest" })}`);
      const oldestNext = await get(
        `/admin/users?${query({ q: prefix, limit: "2", sort: "oldest", cursor: oldest.nextCursor })}`
      );
      assert.deepEqual(
        [...oldest.data, ...oldestNext.data].map((row: { id: string }) => row.id),
        [...seen].reverse()
      );
      assert.equal((await get(`/admin/users?${query({ q: `${prefix}%` })}`)).data.length, 0);
      const tourPage = await get(`/admin/tournaments?${query({ ownerId, limit: "2" })}`);
      const tourNext = await get(
        `/admin/tournaments?${query({ ownerId, limit: "3", cursor: tourPage.nextCursor })}`
      );
      assert.equal(
        new Set([...tourPage.data, ...tourNext.data].map((row: { id: string }) => row.id)).size,
        5
      );
      const completedFilter = { ownerId, dateBy: "completed", limit: "1" };
      const completedPage = await get(`/admin/tournaments?${query(completedFilter)}`);
      const completedNext = await get(`/admin/tournaments?${query({ ...completedFilter, cursor: completedPage.nextCursor })}`);
      assert.equal(completedPage.data[0].id, tournaments[0]);
      assert.equal(completedNext.data[0].id, tournaments[5]);
      assert.equal(completedNext.nextCursor, null);
      await get(`/admin/tournaments?${query({ ownerId, cursor: completedPage.nextCursor })}`, 400);

      assert.equal((await get(`/admin/users/${guestId}`)).data.email, null);
      assert.equal((await get(`/admin/users/${ownerId}`)).data.ownedTournamentCount, 7);
      assert.equal(
        await prisma.adminAccessAudit.count({
          where: { actorUserId: adminId, targetId: `/admin/users/:id#${ownerId}` }
        }),
        1
      );
      const manager = (await get(`/admin/users/${managerId}`)).data;
      assert.equal(manager.ownedTournamentCount, 0);
      assert.equal(manager.performedActivityCount, 1);
      const started = await get(`/admin/tournaments?${query({ ownerId, status: "in-progress" })}`);
      assert.deepEqual(
        new Set(started.data.map((row: { id: string }) => row.id)),
        new Set([tournaments[1], tournaments[2]])
      );
      await prisma.match.updateMany({
        where: { round: { tournamentId: tournaments[1] } },
        data: { completed: true }
      });
      assert.equal((await get(`/admin/tournaments/${tournaments[1]}`)).data.status, "in-progress");
      assert.equal((await get(`/admin/tournaments/${tournaments[0]}`)).data.status, "completed");
      assert.equal((await get(`/admin/tournaments/${tournaments[4]}`)).data.status, "not-started");
      const koh = (await get(`/admin/tournaments/${tournaments[2]}`)).data;
      assert.equal(koh.playerCount, 4);
      assert.deepEqual(koh.matchCounts, { recorded: 1, completed: 0, voided: 0 });
      await get("/admin/users/unknown", 404);
      await get("/admin/tournaments/unknown", 404);
      for (const suffix of ["limit=101", "sort=email", "cursor=invalid", "from=bad", "q=", "email=PRIVATE"])
        await get(`/admin/users?${suffix}`, 400);
      const first = await get(`/admin/users?${query({ q: prefix, limit: "1" })}`);
      await get(`/admin/users?${query({ q: "changed", cursor: first.nextCursor })}`, 400);

      await prisma.user.update({ where: { id: guestId }, data: { isGuest: false } });
      await prisma.tournament.delete({ where: { id: tournaments[3] } });
      const retained = await get(`/admin/overview?${query()}`);
      assert.equal(retained.coverage.historyComplete, false);
      assert.equal(retained.data.current.registeredAccountsCreated, 4);
      assert.equal(retained.data.current.guestAccountsCreated, 0);
      assert.equal(retained.data.current.tournamentsCreated, 4);
      await prisma.platformAdminGrant.update({ where: { userId: adminId }, data: { revokedAt: new Date() } });
      await get("/admin/overview", 403);
    } finally {
      await app.close();
      await prisma.tournament.deleteMany({ where: { organizerId: ownerId } });
      await prisma.adminAccessAudit.deleteMany({ where: { actorUserId: adminId } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      if (oldSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = oldSecret;
      if (oldFlag === undefined) delete process.env.ADMIN_PORTAL_ENABLED;
      else process.env.ADMIN_PORTAL_ENABLED = oldFlag;
    }
  }
);

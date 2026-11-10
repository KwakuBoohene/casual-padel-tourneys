import { createObservedActivity } from "../../../src/modules/usage/infrastructure/observedActivity.js";
import { registerOrganizerMutationWork } from "../../../src/modules/organizerAccess/http/mutationWork.js";
import { requireOrganizerAccess } from "../../../src/lib/auth.js";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { prisma } from "../../../src/lib/prisma.js";
import { registerUsageModule } from "../../../src/modules/usage/http/register.js";
import { registerAdminModule } from "../../../src/modules/admin/http/register.js";
import { registerAppErrorHandler } from "../../../src/shared/http/errorHandler.js";
import { signAuthToken } from "../../../src/lib/auth.js";
import { recordUsageEvent } from "../../../src/modules/usage/infrastructure/recordEvent.js";
import { reportUsage } from "../../../src/modules/usage/infrastructure/reportUsage.js";
import {
  reportActivity,
  lastObservedActivity
} from "../../../src/modules/usage/infrastructure/reportActivity.js";
import { pruneUsage } from "../../../src/modules/usage/infrastructure/pruneUsage.js";
import { PrismaAuthUserRepository } from "../../../src/modules/auth/infrastructure/PrismaAuthUserRepository.js";

const profile = (id: string) => ({
  id,
  name: "Usage test",
  email: `${id}@example.test`,
  isGuest: false,
  emailVerifiedAt: new Date()
});
test("disabled visit collection performs no persistence and admin usage routes still require grants", async () => {
  const previousVisitsEnabled = process.env.USAGE_VISITS_ENABLED;
  const previousJwtSecret = process.env.JWT_SECRET;
  const app = Fastify();
  try {
    process.env.USAGE_VISITS_ENABLED = "false";
    process.env.JWT_SECRET = "usage-test-only";
    registerUsageModule(app);
    registerAdminModule(app, { isAdmin: async () => false, recordRead: async () => assert.fail() });
    assert.equal(
      (await app.inject({ method: "POST", url: "/usage/visits", payload: { anything: true } })).statusCode,
      202
    );
    for (const url of ["/admin/usage", "/admin/activity"])
      assert.equal((await app.inject({ url })).statusCode, 401);
  } finally {
    if (previousVisitsEnabled === undefined) delete process.env.USAGE_VISITS_ENABLED;
    else process.env.USAGE_VISITS_ENABLED = previousVisitsEnabled;
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
    await app.close();
  }
});
test(
  "real usage ingestion, transactional observations, distinct actors, deletion and retention",
  { skip: process.env.USAGE_DB_TESTS !== "true" },
  async () => {
    const old = { ...process.env };
    process.env.USAGE_VISITS_ENABLED = "true";
    process.env.USAGE_BUSINESS_ENABLED = "true";
    process.env.ADMIN_PORTAL_ENABLED = "true";
    process.env.JWT_SECRET = "usage-test-only";
    let createdAccountId: string | null = null;
    const prefix = `usage-${randomUUID()}`;
    const actor = profile(`${prefix}-actor`),
      owner = profile(`${prefix}-owner`);
    const app = Fastify();
    await app.register(rateLimit, { max: 10000 });
    registerAppErrorHandler(app);
    registerOrganizerMutationWork(app);
    registerUsageModule(app);
    registerAdminModule(app);
    app.post("/auth/guest", async () => ({ token: "fixture", user: { id: actor.id } }));
    app.post("/auth/magic-link/consume", async () => ({ token: "fixture", user: { id: actor.id } }));
    const headers = { authorization: `Bearer ${signAuthToken(actor)}`, "X-Organizer-Id": owner.id };
    for (const mode of ["AMERICANO", "KING_OF_THE_COURT"] as const) {
      const route = mode === "AMERICANO" ? "/tournaments" : "/koh/tournaments";
      app.post(route, { preHandler: requireOrganizerAccess }, async (request, reply) => {
        const id = `${prefix}-${mode}`;
        await prisma.tournament.create({
          data: {
            id,
            name: "Observed creation",
            mode,
            variant: "CLASSIC",
            courts: 1,
            pointsPerMatch: 24,
            publicToken: `${prefix}-${mode}-SECRET`,
            organizerId: actor.id
          }
        });
        if ((request.body as { fail?: boolean })?.fail) reply.code(400);
        return { data: { id } };
      });
    }
    app.delete("/tournaments/:id", { preHandler: requireOrganizerAccess }, async (request) => {
      await prisma.tournament.delete({ where: { id: (request.params as { id: string }).id } });
      return { data: { deleted: true } };
    });
    const event = {
      id: randomUUID(),
      sessionId: randomUUID(),
      route: "home",
      occurredAt: new Date().toISOString()
    };
    const batch = { consent: true, surface: "organizer", events: [event] };
    try {
      await prisma.user.createMany({ data: [actor, owner] });
      await prisma.platformAdminGrant.create({ data: { userId: actor.id } });
      assert.equal(
        (await app.inject({ method: "POST", url: "/usage/visits", payload: batch })).statusCode,
        401
      );
      for (const payload of [
        { ...batch, actorUserId: owner.id },
        { ...batch, surface: "viewer" },
        { ...batch, consent: false },
        { ...batch, events: [{ ...event, occurredAt: "2000-01-01T00:00:00Z" }] }
      ])
        assert.equal(
          (await app.inject({ method: "POST", url: "/usage/visits", headers, payload })).statusCode,
          400
        );
      const before = await prisma.usageDay.aggregate({ where: { kind: "visit" }, _sum: { count: true } });
      const responses = await Promise.all(
        Array.from({ length: 3 }, () =>
          app.inject({ method: "POST", url: "/usage/visits", headers, payload: batch })
        )
      );
      assert.ok(responses.every((r) => r.statusCode === 202));
      const stored = await prisma.usageEvent.findUniqueOrThrow({ where: { id: `visit:${event.id}` } });
      assert.equal(stored.actorUserId, actor.id);
      assert.equal(stored.ownerId, null);
      const after = await prisma.usageDay.aggregate({ where: { kind: "visit" }, _sum: { count: true } });
      assert.equal((after._sum.count ?? 0) - (before._sum.count ?? 0), 1);
      assert.equal(
        (
          await app.inject({
            method: "POST",
            url: "/usage/visits",
            headers,
            payload: { ...batch, events: [{ ...event, id: randomUUID() }], extra: "x".repeat(9000) }
          })
        ).statusCode,
        413
      );
      const from = new Date(Date.now() - 60_000).toISOString(),
        to = new Date(Date.now() + 60_000).toISOString();
      await prisma.$transaction(async (tx) => {
        await createObservedActivity(tx, {
          data: {
            organizerId: owner.id,
            actorUserId: actor.id,
            actorName: "PRIVATE-ACTOR-NAME",
            action: "HISTORICAL_IMPORT_CREATED",
            targetId: `${prefix}-import`,
            metadata: { private: "PRIVATE-IMPORT-DATA" }
          }
        });
        await recordUsageEvent(tx, {
          id: `${prefix}-creation`,
          kind: "tournament.created",
          surface: "organizer",
          actorUserId: owner.id,
          targetId: "deleted-tournament"
        });
      });
      const report = await reportUsage({ from, to });
      assert.ok((report.data.current.activeUsers ?? 0) >= 2);
      await prisma.$transaction((tx) =>
        recordUsageEvent(tx, {
          id: `${prefix}-repeat-actor`,
          kind: "business.action",
          surface: "organizer",
          actorUserId: actor.id
        })
      );
      assert.equal(
        (await reportUsage({ from, to })).data.current.activeUsers,
        report.data.current.activeUsers
      );
      assert.equal(report.data.current.visits, 1);
      assert.equal(report.data.current.partial, true);
      const page = await reportActivity({ from, to, actorUserId: actor.id, limit: 1 });
      assert.equal(page.data.length, 1);
      const feed = await reportActivity({ from, to, actorUserId: actor.id, limit: 25 });
      const business = feed.data.find((row) => row.action === "HISTORICAL_IMPORT_CREATED");
      assert.equal(business?.ownerId, owner.id);
      assert.equal(business?.actorUserId, actor.id);
      assert.ok(!JSON.stringify(feed).includes("PRIVATE-"));
      assert.ok(page.nextCursor);
      await assert.rejects(
        reportActivity({ from, to, actorUserId: owner.id, limit: 1, cursor: page.nextCursor! })
      );
      assert.ok((await lastObservedActivity([actor.id])).get(actor.id));
      await assert.rejects(
        prisma.$transaction(async (tx) => {
          await recordUsageEvent(tx, {
            id: `${prefix}-rollback`,
            kind: "business.action",
            surface: "organizer"
          });
          throw new Error("rollback");
        })
      );
      assert.equal(await prisma.usageEvent.count({ where: { id: `${prefix}-rollback` } }), 0);
      const users = new PrismaAuthUserRepository();
      const account = await users.create({ email: `${prefix}-new@example.test`, name: "New", isGuest: true });
      createdAccountId = account.id;
      await users.update(account.id, { isGuest: false });
      await users.update(account.id, { isGuest: false });
      assert.equal(await prisma.usageEvent.count({ where: { id: `conversion:${account.id}` } }), 1);
      await prisma.user.delete({ where: { id: account.id } });
      assert.equal(await prisma.usageEvent.count({ where: { id: `account:${account.id}` } }), 1);
      await app.inject({ method: "POST", url: "/auth/guest" });
      assert.equal(await prisma.usageEvent.count({ where: { kind: "login", actorUserId: actor.id } }), 1);
      await app.inject({
        method: "POST",
        url: "/auth/magic-link/consume",
        payload: { clientSurface: "viewer-admin" }
      });
      assert.equal(await prisma.usageEvent.count({ where: { kind: "login", actorUserId: actor.id } }), 1);
      for (const url of ["/admin/usage", "/admin/activity"]) {
        const r = await app.inject({ url, headers });
        assert.equal(r.statusCode, 200, r.body);
        assert.equal(r.headers["cache-control"], "no-store");
      }
      const mutationHeaders = { authorization: headers.authorization };
      for (const route of ["/tournaments", "/koh/tournaments"]) {
        const result = await app.inject({
          method: "POST",
          url: route,
          headers: mutationHeaders,
          payload: {}
        });
        assert.equal(result.statusCode, 200, result.body);
        const id = result.json().data.id as string;
        assert.equal(
          await prisma.usageEvent.count({ where: { kind: "tournament.created", targetId: id } }),
          1
        );
        assert.equal(
          (await app.inject({ method: "DELETE", url: `/tournaments/${id}`, headers: mutationHeaders }))
            .statusCode,
          200
        );
        assert.equal(
          await prisma.usageEvent.count({ where: { kind: "tournament.created", targetId: id } }),
          1
        );
      }
      assert.equal(
        (
          await app.inject({
            method: "POST",
            url: "/tournaments",
            headers: mutationHeaders,
            payload: { fail: true }
          })
        ).statusCode,
        400
      );
      assert.equal(await prisma.tournament.count({ where: { id: `${prefix}-AMERICANO` } }), 0);
      const limited = await Promise.all(
        Array.from({ length: 61 }, () =>
          app.inject({ method: "POST", url: "/usage/visits", headers, payload: batch })
        )
      );
      assert.ok(limited.some((response) => response.statusCode === 429));
      const expired = new Date(Date.now() - 91 * 86_400_000);
      await prisma.usageEvent.create({
        data: {
          id: `${prefix}-expired`,
          occurredAt: expired,
          kind: "visit",
          surface: "organizer",
          actorUserId: owner.id
        }
      });
      const day = new Date(expired);
      day.setUTCHours(0, 0, 0, 0);
      await prisma.usageDay.upsert({
        where: { day_surface_kind: { day, surface: "organizer", kind: "visit" } },
        create: { day, surface: "organizer", kind: "visit", count: 1 },
        update: {}
      });
      const oldDay = new Date("2020-01-01T00:00:00Z");
      await prisma.usageDay.upsert({
        where: { day_surface_kind: { day: oldDay, surface: "organizer", kind: "visit" } },
        create: { day: oldDay, surface: "organizer", kind: "visit", count: 1 },
        update: {}
      });
      await pruneUsage();
      assert.equal(await prisma.usageDay.count({ where: { day: oldDay } }), 0);
      assert.equal(await prisma.usageEvent.count({ where: { id: `${prefix}-expired` } }), 0);
      assert.ok(
        await prisma.usageDay.findUnique({
          where: { day_surface_kind: { day, surface: "organizer", kind: "visit" } }
        })
      );
    } finally {
      await app.close();
      await prisma.tournament.deleteMany({ where: { id: { startsWith: prefix } } });
      await prisma.usageEvent.deleteMany({
        where: {
          OR: [
            { actorUserId: { in: [actor.id, owner.id, ...(createdAccountId ? [createdAccountId] : [])] } },
            { id: { startsWith: prefix } }
          ]
        }
      });
      await prisma.user.deleteMany({ where: { id: { in: [actor.id, owner.id] } } });
      for (const key of [
        "USAGE_VISITS_ENABLED",
        "USAGE_BUSINESS_ENABLED",
        "ADMIN_PORTAL_ENABLED",
        "JWT_SECRET"
      ]) {
        if (old[key] === undefined) delete process.env[key];
        else process.env[key] = old[key];
      }
    }
  }
);

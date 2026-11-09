import { PrismaMagicTokenStore } from "../../../src/modules/auth/infrastructure/PrismaMagicTokenStore.js";
import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import { registerAdminModule } from "../../../src/modules/admin/http/register.js";
import { PrismaAdminAccessStore } from "../../../src/modules/admin/infrastructure/PrismaAdminAccessStore.js";
import { signAuthToken } from "../../../src/lib/auth.js";
import { prisma } from "../../../src/lib/prisma.js";

const profile = (id: string) => ({
  id,
  name: "Admin test",
  email: `${id}@example.test`,
  isGuest: false,
  emailVerifiedAt: new Date()
});

test("admin routes enforce auth, feature flag, live grants, actor identity and fail-closed audit", async () => {
  const savedFlag = process.env.ADMIN_PORTAL_ENABLED;
  const savedSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "admin-route-test-only";
  process.env.ADMIN_PORTAL_ENABLED = "true";
  let granted = true;
  let auditFails = false;
  const audits: unknown[] = [];
  const app = Fastify();
  registerAdminModule(app, {
    isAdmin: async (id) => id === "admin" && granted,
    recordRead: async (...args) => {
      if (auditFails) throw new Error("audit unavailable");
      audits.push(args);
    }
  });
  const headers = { authorization: `Bearer ${signAuthToken(profile("admin"))}` };
  try {
    for (const authorization of [undefined, "Bearer invalid"]) {
      const response = await app.inject({
        url: "/admin/access",
        headers: authorization ? { authorization } : {}
      });
      assert.equal(response.statusCode, 401);
      assert.equal(response.headers["cache-control"], "no-store");
    }
    const ordinary = await app.inject({
      url: "/admin/access",
      headers: { authorization: `Bearer ${signAuthToken(profile("owner"))}` }
    });
    assert.equal(ordinary.statusCode, 403);
    const allowed = await app.inject({
      url: "/admin/access?search=PRIVATE",
      headers: { ...headers, "x-organizer-id": "another-owner" }
    });
    assert.deepEqual(allowed.json(), { data: { actorUserId: "admin", access: "ADMIN" } });
    assert.equal(allowed.headers["cache-control"], "no-store");
    assert.equal(audits.length, 1);
    assert.ok(JSON.stringify(audits).includes("/admin/access"));
    assert.ok(!JSON.stringify(audits).includes("PRIVATE"));
    granted = false;
    assert.equal((await app.inject({ url: "/admin/access", headers })).statusCode, 403);
    granted = true;
    process.env.ADMIN_PORTAL_ENABLED = "false";
    assert.equal((await app.inject({ url: "/admin/access", headers })).statusCode, 403);
    process.env.ADMIN_PORTAL_ENABLED = "true";
    auditFails = true;
    assert.equal((await app.inject({ url: "/admin/access", headers })).statusCode, 500);
  } finally {
    await app.close();
    if (savedFlag === undefined) delete process.env.ADMIN_PORTAL_ENABLED;
    else process.env.ADMIN_PORTAL_ENABLED = savedFlag;
    if (savedSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = savedSecret;
  }
});

test(
  "persisted grants exclude guests/unverified/deleted users and reflect revocation immediately",
  { skip: process.env.ADMIN_DB_TESTS !== "true" },
  async () => {
    const id = `admin-${randomUUID()}`;
    const store = new PrismaAdminAccessStore();
    try {
      assert.equal(await store.isAdmin(id), false);
      await prisma.user.create({ data: profile(id) });
      assert.equal(await store.isAdmin(id), false);
      await prisma.platformAdminGrant.create({ data: { userId: id } });
      assert.equal(await store.isAdmin(id), true);
      const tokens = new PrismaMagicTokenStore();
      const token = await tokens.issue({
        userId: id,
        purpose: "LOGIN",
        expiresAt: new Date(Date.now() + 60_000)
      });
      const results = await Promise.all([tokens.consumeSignIn(token), tokens.consumeSignIn(token)]);
      assert.equal(
        results.filter(Boolean).length,
        1,
        "a sign-in capability can be claimed only once, including concurrent requests"
      );
      await store.recordRead(id, "/admin/access", "request-test");
      assert.equal(await prisma.adminAccessAudit.count({ where: { actorUserId: id } }), 1);
      await prisma.user.update({ where: { id }, data: { isGuest: true } });
      assert.equal(await store.isAdmin(id), false);
      await prisma.user.update({ where: { id }, data: { isGuest: false, emailVerifiedAt: null } });
      assert.equal(await store.isAdmin(id), false);
      await prisma.user.update({ where: { id }, data: { emailVerifiedAt: new Date() } });
      await prisma.platformAdminGrant.update({ where: { userId: id }, data: { revokedAt: new Date() } });
      assert.equal(await store.isAdmin(id), false);
      await prisma.user.delete({ where: { id } });
      assert.equal(await store.isAdmin(id), false);
      assert.equal(await prisma.platformAdminGrant.count({ where: { userId: id } }), 0);
    } finally {
      await prisma.adminAccessAudit.deleteMany({ where: { actorUserId: id } });
      await prisma.user.deleteMany({ where: { id } });
    }
  }
);

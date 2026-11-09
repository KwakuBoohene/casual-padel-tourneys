import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { registerAdminModule } from "../../../src/modules/admin/http/register.js";
import { buildAdminSignInUrl } from "../../../src/modules/auth/infrastructure/authLinks.js";

test("anonymous admin email requests are generic, do not create users, and only issue links to granted accounts", async () => {
  const old = process.env.ADMIN_PORTAL_ENABLED;
  process.env.ADMIN_PORTAL_ENABLED = "true";
  const deliveries: string[] = [];
  let granted = true;
  const app = Fastify();
  registerAdminModule(
    app,
    { isAdmin: async () => granted, recordRead: async () => {} },
    {
      findUser: async (email) => (email === "admin@example.test" ? { id: "admin" } : null),
      issueToken: async (id, expiry) => {
        assert.equal(id, "admin");
        assert.ok(expiry.getTime() > Date.now());
        return "fixture-token";
      },
      sendLink: async (email) => {
        deliveries.push(email);
      }
    }
  );
  try {
    const request = (email: string) =>
      app.inject({ method: "POST", url: "/admin/sign-in", payload: { email } });
    const allowed = await request("ADMIN@example.test");
    assert.equal(allowed.statusCode, 200);
    assert.equal(allowed.headers["cache-control"], "no-store");
    assert.deepEqual(deliveries, ["admin@example.test"]);
    assert.deepEqual((await request("absent@example.test")).json(), allowed.json());
    granted = false;
    assert.deepEqual((await request("admin@example.test")).json(), allowed.json());
    granted = true;
    process.env.ADMIN_PORTAL_ENABLED = "false";
    assert.deepEqual((await request("admin@example.test")).json(), allowed.json());
    assert.equal(deliveries.length, 1);
    assert.equal((await request("invalid")).statusCode, 400);
  } finally {
    await app.close();
    if (old === undefined) delete process.env.ADMIN_PORTAL_ENABLED;
    else process.env.ADMIN_PORTAL_ENABLED = old;
  }
});

test("admin links use a server-configured viewer origin and fragment token, never caller-selected redirects", () => {
  const old = process.env.ADMIN_WEB_BASE_URL;
  const nodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_WEB_BASE_URL = "https://viewer.example.test";
    const link = new URL(buildAdminSignInUrl("fixture-token"));
    assert.equal(link.pathname, "/admin/sign-in");
    assert.equal(link.search, "");
    assert.equal(new URLSearchParams(link.hash.slice(1)).get("token"), "fixture-token");
    for (const base of [
      "https://user:secret@viewer.test",
      "javascript:alert(1)",
      "https://viewer.test/?redirect=evil",
      "https://viewer.test/path",
      "http://viewer.test"
    ]) {
      process.env.ADMIN_WEB_BASE_URL = base;
      assert.throws(() => buildAdminSignInUrl("fixture-token"));
    }
  } finally {
    if (old === undefined) delete process.env.ADMIN_WEB_BASE_URL;
    else process.env.ADMIN_WEB_BASE_URL = old;
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
  }
});

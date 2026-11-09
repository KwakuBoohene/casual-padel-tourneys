import assert from "node:assert/strict";
import test from "node:test";
import { parseAdminMagicToken } from "../../lib/admin/magicLink";
import { adminRequest, AdminRequestError } from "../../lib/admin/api";

test("admin magic links accept only a bounded fragment capability on the fixed sign-in path", () => {
  const token = "a".repeat(43);
  assert.equal(parseAdminMagicToken(`https://viewer.test/admin/sign-in#token=${token}`), token);
  for (const url of [
    `https://viewer.test/admin/sign-in?token=${token}`,
    `https://viewer.test/tournament/x#token=${token}`,
    "https://viewer.test/admin/sign-in#token=short"
  ])
    assert.equal(parseAdminMagicToken(url), null);
});

test("private fetches explicitly attach bearer auth, prevent public endpoint use, and request no caching", async () => {
  const previous = globalThis.fetch;
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { __PADEL_CONFIG__: { apiBaseUrl: "https://api.test" }, location: { protocol: "https:" } }
  });
  globalThis.fetch = async (_url, options) => {
    assert.equal(options?.cache, "no-store");
    assert.equal((options?.headers as Record<string, string>).Authorization, "Bearer fixture");
    assert.equal((options?.headers as Record<string, string>)["X-Organizer-Id"], undefined);
    return new Response(JSON.stringify({ data: { access: "ADMIN" } }));
  };
  try {
    await adminRequest("/admin/access", { token: "fixture" });
    await assert.rejects(adminRequest("/public/share", { token: "fixture" }), /Invalid admin endpoint/);
    globalThis.fetch = async () => new Response("{}", { status: 403 });
    await assert.rejects(
      adminRequest("/admin/access"),
      (error) => error instanceof AdminRequestError && error.status === 403
    );
  } finally {
    globalThis.fetch = previous;
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

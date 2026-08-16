import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../../../src/app.js";
import { REQUEST_ID_HEADER, redactUrl } from "../../../src/shared/http/requestContext.js";

async function withApp<T>(fn: (app: Awaited<ReturnType<typeof createApp>>) => Promise<T>): Promise<T> {
  const originalRedis = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  const app = await createApp();
  try {
    return await fn(app);
  } finally {
    await app.close();
    if (originalRedis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedis;
  }
}

test("GET /health reports liveness without touching the database", async () => {
  await withApp(async (app) => {
    const response = await app.inject({ method: "GET", url: "/health" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: "ok", ok: true });
  });
});

test("GET /ready reports database connectivity", async () => {
  await withApp(async (app) => {
    const response = await app.inject({ method: "GET", url: "/ready" });
    const body = response.json() as {
      ok: boolean;
      checks: { database: string };
    };

    if (response.statusCode === 200) {
      assert.equal(body.ok, true);
      assert.equal(body.checks.database, "up");
      return;
    }

    // Fails closed when Postgres is unreachable; liveness must still be fine.
    assert.equal(response.statusCode, 503);
    assert.equal(body.ok, false);
    assert.equal(body.checks.database, "down");
    const health = await app.inject({ method: "GET", url: "/health" });
    assert.equal(health.statusCode, 200);
  });
});

test("request id is taken from the incoming header and echoed back", async () => {
  await withApp(async (app) => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { [REQUEST_ID_HEADER]: "trace-abc-123" }
    });
    assert.equal(response.headers[REQUEST_ID_HEADER], "trace-abc-123");

    const generated = await app.inject({ method: "GET", url: "/health" });
    assert.ok(
      typeof generated.headers[REQUEST_ID_HEADER] === "string" &&
        generated.headers[REQUEST_ID_HEADER] !== ""
    );
  });
});

test("share tokens are redacted before request urls reach the logs", () => {
  assert.equal(redactUrl("/public/public_abc123"), "/public/[redacted]");
  assert.equal(redactUrl("/public/public_abc123/rankings"), "/public/[redacted]/rankings");
  assert.equal(
    redactUrl("/ws/tournaments/tournament_1?token=public_abc123"),
    "/ws/tournaments/tournament_1?token=[redacted]"
  );
  assert.equal(redactUrl("/tournaments?range=year"), "/tournaments?range=year");
});

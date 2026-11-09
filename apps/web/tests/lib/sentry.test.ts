import assert from "node:assert/strict";
import test from "node:test";
import * as Sentry from "@sentry/browser";
import { sanitizeViewerError, sanitizeViewerTrace, sampleRate } from "../../lib/observability/privacy";
import {
  captureViewerError,
  initViewerMonitoring,
  viewerFetch,
  viewerJson,
  watchViewerConnection
} from "../../lib/observability/sentry";

test("browser diagnostics discard URLs, names, request context and secrets", () => {
  const event: Sentry.ErrorEvent = {
    type: undefined,
    message: "Ama SECRET",
    user: { id: "Ama", email: "ama@example.com" },
    request: { url: "https://app.test/auth/magic?token=SECRET" },
    breadcrumbs: [{ message: "SECRET" }],
    extra: { body: "SECRET" },
    exception: {
      values: [
        {
          type: "TypeError",
          value: "Ama SECRET",
          stacktrace: {
            frames: [
              {
                filename: "https://app.test/assets/app-123.js?token=SECRET",
                lineno: 12,
                context_line: "SECRET"
              }
            ]
          }
        }
      ]
    }
  };
  const clean = sanitizeViewerError(event);
  for (const secret of ["SECRET", "Ama", "example.com", "app.test", "context_line"]) {
    assert.ok(!JSON.stringify(clean).includes(secret));
  }
  assert.equal(clean?.exception?.values?.[0].stacktrace?.frames?.[0].filename, "app-123.js");
  assert.equal(clean?.exception?.values?.[0].stacktrace?.frames?.[0].lineno, 12);
  assert.equal(
    sanitizeViewerError(event, { originalException: Object.assign(new Error(), { name: "ApiError" }) }),
    null
  );
  assert.equal(
    sanitizeViewerError(event, { originalException: Object.assign(new Error(), { name: "AbortError" }) }),
    null
  );
  assert.equal(
    sanitizeViewerError({
      ...event,
      exception: {
        values: [{ stacktrace: { frames: [{ filename: "https://app.test/tournament/SECRET.js" }] } }]
      }
    })?.exception?.values?.[0].stacktrace?.frames?.[0].filename,
    undefined
  );
});

test("trace payload allowlist drops all dynamic data and child spans", () => {
  const clean = sanitizeViewerTrace({
    type: "transaction",
    transaction: "SECRET",
    request: { url: "SECRET" },
    extra: { password: "SECRET" },
    contexts: { private: { token: "SECRET" } },
    spans: []
  });
  assert.equal(clean.transaction, "API request");
  assert.ok(!JSON.stringify(clean).includes("SECRET"));
  assert.equal(sampleRate(undefined), 0.1);
  for (const value of ["-1", "2", "invalid"]) assert.equal(sampleRate(value), 0);
});

test("without DSN/browser initialization is inert and fetch preserves its arguments", async () => {
  initViewerMonitoring();
  assert.equal(Sentry.isInitialized(), false);
  captureViewerError(new Error("not sent"), "render");
  const previous = globalThis.fetch;
  const init = { method: "POST", headers: { Authorization: "Bearer PRIVATE" }, body: "PRIVATE" };
  const response = new Response("{}", { status: 200 });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.test/tournaments");
    assert.equal(options, init);
    return response;
  };
  try {
    assert.equal(await viewerFetch("https://api.test/tournaments", init), response);
  } finally {
    globalThis.fetch = previous;
  }
});

test("capture and fetch timing use sanitized envelopes without changing HTTP or abort behavior", async () => {
  const envelopes: unknown[] = [];
  Sentry.init({
    dsn: "https://public@example.com/1",
    defaultIntegrations: false,
    traceLifecycle: "static",
    tracesSampleRate: 1,
    beforeSend: sanitizeViewerError,
    beforeSendTransaction: sanitizeViewerTrace,
    transport: () => ({
      send: async (envelope) => {
        envelopes.push(envelope);
        return {};
      },
      flush: async () => true
    })
  });
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("PRIVATE", { status: 500 });
    assert.equal((await viewerFetch("https://api.test/public/SECRET", {})).status, 500);
    const abort = Object.assign(new Error("SECRET"), { name: "AbortError" });
    globalThis.fetch = async () => {
      throw abort;
    };
    await assert.rejects(viewerFetch("https://api.test", {}), (error) => error === abort);
    globalThis.fetch = async () => {
      throw new TypeError("SECRET");
    };
    await assert.rejects(viewerFetch("https://api.test", {}), TypeError);
    // Repeat server failures are rate-limited; 404/410 and aborts stay quiet.
    globalThis.fetch = async () => new Response("PRIVATE", { status: 503 });
    await viewerFetch("https://api.test", {});
    globalThis.fetch = async () => new Response("PRIVATE", { status: 404 });
    await viewerFetch("https://api.test", {});
    await assert.rejects(viewerJson(new Response("SECRET")), SyntaxError);
    await Sentry.flush(2000);
    const items = envelopes.flatMap((value) => (value as [unknown, [Record<string, unknown>, unknown][]])[1]);
    assert.equal(items.filter(([header]) => header.type === "event").length, 3);
    assert.equal(items.filter(([header]) => header.type === "transaction").length, 5);
    const eventCount = () =>
      envelopes
        .flatMap((value) => (value as [unknown, [Record<string, unknown>, unknown][]])[1])
        .filter(([header]) => header.type === "event").length;
    const socket = new EventTarget();
    const stop = watchViewerConnection(socket as WebSocket, 10);
    socket.dispatchEvent(Object.assign(new Event("close"), { code: 4404 }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    await Sentry.flush(2000);
    assert.equal(eventCount(), 3);
    socket.dispatchEvent(Object.assign(new Event("close"), { code: 1006 }));
    // A close is not reported immediately.
    await Sentry.flush(2000);
    assert.equal(eventCount(), 3);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await Sentry.flush(2000);
    assert.equal(eventCount(), 4);
    stop();
    const otherSocket = new EventTarget();
    const cancel = watchViewerConnection(otherSocket as WebSocket, 10);
    otherSocket.dispatchEvent(Object.assign(new Event("close"), { code: 1006 }));
    cancel();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await Sentry.flush(2000);
    assert.equal(eventCount(), 4);
    for (const secret of ["SECRET", "PRIVATE", "api.test"])
      assert.ok(!JSON.stringify(envelopes).includes(secret));
  } finally {
    globalThis.fetch = previous;
    await Sentry.close();
  }
});

test("source map debug IDs survive privacy filtering without exposing page capabilities", () => {
  const debugId = "01234567-1234-1234-1234-0123456789ab";
  const event: Sentry.ErrorEvent = {
    type: undefined,
    debug_meta: {
      images: [
        {
          type: "sourcemap",
          code_file: "https://app.test/assets/app-123.js?token=SECRET",
          debug_id: debugId
        },
        { type: "sourcemap", code_file: "https://app.test/tournament/SECRET.js", debug_id: debugId },
        { type: "sourcemap", code_file: "https://app.test/assets/app-123.js", debug_id: "SECRET" }
      ]
    },
    exception: {
      values: [
        {
          stacktrace: {
            frames: [{ filename: "https://app.test/assets/app-123.js?token=SECRET", lineno: 1, colno: 42 }]
          }
        }
      ]
    }
  };
  const clean = sanitizeViewerError(event);
  assert.deepEqual(clean?.debug_meta?.images, [
    { type: "sourcemap", code_file: "app-123.js", debug_id: debugId }
  ]);
  assert.equal(clean?.exception?.values?.[0].stacktrace?.frames?.[0].filename, "app-123.js");
  assert.ok(!JSON.stringify(clean).includes("SECRET"));
});

test("an injected bundle retains its matching debug ID through the actual SDK event pipeline", async (t) => {
  const { mkdtemp, writeFile, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join, resolve } = await import("node:path");
  const { createRequire } = await import("node:module");
  const { spawnSync } = await import("node:child_process");
  const { runInThisContext } = await import("node:vm");
  const directory = await mkdtemp(join(tmpdir(), "cpa-debug-id-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const script = join(directory, "fixture.js");
  await writeFile(script, 'throw new Error("PRIVATE");\n//# sourceMappingURL=fixture.js.map\n');
  await writeFile(
    `${script}.map`,
    JSON.stringify({
      version: 3,
      file: "fixture.js",
      sources: ["original.ts"],
      sourcesContent: ['throw new Error("PRIVATE");'],
      names: [],
      mappings: "AAAA"
    })
  );
  const require = createRequire(resolve(process.cwd(), "package.json"));
  const injected = spawnSync(process.execPath, [
    require.resolve("@sentry/cli/bin/sentry-cli"),
    "sourcemaps",
    "inject",
    directory
  ]);
  assert.equal(injected.status, 0, injected.stderr.toString());
  const map = JSON.parse(await readFile(`${script}.map`, "utf8")) as { debug_id?: string; debugId?: string };
  const debugId = map.debug_id ?? map.debugId;
  assert.ok(debugId);
  const envelopes: unknown[] = [];
  Sentry.init({
    dsn: "https://public@example.com/1",
    defaultIntegrations: false,
    beforeSend: sanitizeViewerError,
    transport: () => ({
      send: async (envelope) => {
        envelopes.push(envelope);
        return {};
      },
      flush: async () => true
    })
  });
  try {
    try {
      runInThisContext(await readFile(script, "utf8"), {
        filename: "https://viewer.test/assets/fixture.js?token=SECRET"
      });
    } catch (error) {
      Sentry.captureException(error);
    }
    await Sentry.flush(2000);
    const items = envelopes.flatMap(
      (value) => (value as [unknown, [Record<string, unknown>, Sentry.ErrorEvent][]])[1]
    );
    const event = items.find(([header]) => header.type === "event")?.[1];
    assert.ok(
      event?.debug_meta?.images?.some(
        (image) =>
          image.type === "sourcemap" && image.code_file === "fixture.js" && image.debug_id === debugId
      )
    );
    assert.ok(
      event?.exception?.values?.[0].stacktrace?.frames?.some((frame) => frame.filename === "fixture.js")
    );
    for (const secret of ["SECRET", "PRIVATE", "viewer.test"])
      assert.ok(!JSON.stringify(envelopes).includes(secret));
  } finally {
    await Sentry.close();
  }
});

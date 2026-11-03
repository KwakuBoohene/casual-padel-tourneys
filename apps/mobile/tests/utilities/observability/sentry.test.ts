import assert from "node:assert/strict";
import test from "node:test";
import * as Sentry from "@sentry/browser";
import {
  sanitizeBrowserError,
  sanitizeBrowserTrace,
  sampleRate
} from "../../../src/utilities/observability/sentryPrivacy";
import {
  captureClientError,
  initSentry,
  monitoredFetch
} from "../../../src/utilities/observability/sentry.web";

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
                filename: "https://app.test/_expo/static/js/web/app-123.js?token=SECRET",
                lineno: 12,
                context_line: "SECRET"
              }
            ]
          }
        }
      ]
    }
  };
  const clean = sanitizeBrowserError(event);
  for (const secret of ["SECRET", "Ama", "example.com", "app.test", "context_line"]) {
    assert.ok(!JSON.stringify(clean).includes(secret));
  }
  assert.equal(clean?.exception?.values?.[0].stacktrace?.frames?.[0].filename, "app-123.js");
  assert.equal(clean?.exception?.values?.[0].stacktrace?.frames?.[0].lineno, 12);
  assert.equal(
    sanitizeBrowserError(event, { originalException: Object.assign(new Error(), { name: "ApiError" }) }),
    null
  );
  assert.equal(
    sanitizeBrowserError(event, { originalException: Object.assign(new Error(), { name: "AbortError" }) }),
    null
  );
});

test("trace payload allowlist drops all dynamic data and child spans", () => {
  const clean = sanitizeBrowserTrace({
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
  initSentry();
  assert.equal(Sentry.isInitialized(), false);
  captureClientError(new Error("not sent"));
  const previous = globalThis.fetch;
  const init = { method: "POST", headers: { Authorization: "Bearer PRIVATE" }, body: "PRIVATE" };
  const response = new Response("{}", { status: 200 });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.test/tournaments");
    assert.equal(options, init);
    return response;
  };
  try {
    assert.equal(await monitoredFetch("https://api.test/tournaments", init), response);
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
    beforeSend: sanitizeBrowserError,
    beforeSendTransaction: sanitizeBrowserTrace,
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
    assert.equal((await monitoredFetch("https://api.test/public/SECRET", {})).status, 500);
    const abort = Object.assign(new Error("SECRET"), { name: "AbortError" });
    globalThis.fetch = async () => {
      throw abort;
    };
    await assert.rejects(monitoredFetch("https://api.test", {}), (error) => error === abort);
    globalThis.fetch = async () => {
      throw new TypeError("SECRET");
    };
    await assert.rejects(monitoredFetch("https://api.test", {}), TypeError);
    await Sentry.flush(2000);
    const items = envelopes.flatMap((value) => (value as [unknown, [Record<string, unknown>, unknown][]])[1]);
    assert.equal(items.filter(([header]) => header.type === "event").length, 1);
    assert.equal(items.filter(([header]) => header.type === "transaction").length, 3);
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
          code_file: "https://app.test/_expo/static/js/web/app-123.js?token=SECRET",
          debug_id: debugId
        },
        { type: "sourcemap", code_file: "https://app.test/tournament/SECRET.js", debug_id: debugId },
        {
          type: "sourcemap",
          code_file: "https://app.test/_expo/static/js/web/app-123.js",
          debug_id: "SECRET"
        }
      ]
    },
    exception: {
      values: [
        {
          stacktrace: {
            frames: [
              {
                filename: "https://app.test/_expo/static/js/web/app-123.js?token=SECRET",
                lineno: 1,
                colno: 42
              }
            ]
          }
        }
      ]
    }
  };
  const clean = sanitizeBrowserError(event);
  assert.deepEqual(clean?.debug_meta?.images, [
    { type: "sourcemap", code_file: "app-123.js", debug_id: debugId }
  ]);
  assert.equal(clean?.exception?.values?.[0].stacktrace?.frames?.[0].filename, "app-123.js");
  assert.ok(!JSON.stringify(clean).includes("SECRET"));
});

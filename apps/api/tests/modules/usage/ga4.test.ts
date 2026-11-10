import assert from "node:assert/strict";
import { test } from "node:test";
import Fastify from "fastify";
import { signAuthToken } from "../../../src/lib/auth.js";
import { registerGa4Collection } from "../../../src/modules/usage/http/ga4.js";

test("GA4 relay rejects unapproved requests and sends only isolated, sanitized payloads", async (t) => {
  const settings = {
    JWT_SECRET: "local-ga4-test",
    GA4_VIEWER_ENABLED: "true", GA4_VIEWER_MEASUREMENT_ID: "G-TESTVIEWER",
    GA4_VIEWER_API_SECRET: "fixture-viewer-secret", GA4_VIEWER_ORIGIN: "https://viewer.example",
    GA4_ORGANIZER_ENABLED: "true", GA4_ORGANIZER_MEASUREMENT_ID: "G-TESTORGANIZER",
    GA4_ORGANIZER_API_SECRET: "fixture-organizer-secret", GA4_ORGANIZER_ORIGIN: "https://organizer.example"
  };
  const restore = new Map(Object.keys(settings).map((key) => [key, process.env[key]]));
  Object.assign(process.env, settings);
  const app = Fastify();
  const outgoing: { url: URL; options?: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, options?: RequestInit) => {
    outgoing.push({ url, options });
    return new Response(null, { status: 204 });
  });
  registerGa4Collection(app);
  const envelope = {
    consent: true, clientId: "d9428888-122b-4d29-8a6b-64d9c2157110", sessionId: 1_720_000_000, device: "mobile"
  };
  const viewer = { ...envelope, event: "page_view", page: "scoreboard", acquisition: "google" };
  const organizer = { ...envelope, event: "creation_step_reached", step: "players" };
  const token = signAuthToken({
    id: "account-fixture", email: "private@example.test", name: "Private Player", isGuest: false
  });
  const post = (surface: "viewer" | "organizer", payload: object, origin: string, auth?: string) =>
    app.inject({
      method: "POST", url: `/analytics/ga4/${surface}`, payload,
      headers: { origin, referer: origin + "/tournament/PRIVATE-TOKEN?email=private@example.test", ...(auth ? { authorization: `Bearer ${auth}` } : {}) }
    });

  try {
    process.env.GA4_VIEWER_ENABLED = "false";
    assert.equal((await post("viewer", viewer, settings.GA4_VIEWER_ORIGIN)).statusCode, 404);
    process.env.GA4_VIEWER_ENABLED = "true";
    assert.equal((await post("viewer", viewer, "https://other.example")).statusCode, 404);
    assert.equal((await post("viewer", { ...viewer, consent: false }, settings.GA4_VIEWER_ORIGIN)).statusCode, 400);
    assert.equal((await post("viewer", { ...viewer, page_location: "PRIVATE-TOKEN" }, settings.GA4_VIEWER_ORIGIN)).statusCode, 400);
    assert.equal((await post("viewer", organizer, settings.GA4_VIEWER_ORIGIN)).statusCode, 400);
    assert.equal((await post("organizer", organizer, settings.GA4_ORGANIZER_ORIGIN)).statusCode, 401);
    assert.equal((await post("organizer", { ...organizer, step: "Private Player" }, settings.GA4_ORGANIZER_ORIGIN, token)).statusCode, 400);
    process.env.GA4_ORGANIZER_MEASUREMENT_ID = settings.GA4_VIEWER_MEASUREMENT_ID;
    assert.equal((await post("viewer", viewer, settings.GA4_VIEWER_ORIGIN)).statusCode, 404);
    assert.equal(outgoing.length, 0);
    process.env.GA4_ORGANIZER_MEASUREMENT_ID = settings.GA4_ORGANIZER_MEASUREMENT_ID;
    assert.equal((await post("viewer", viewer, settings.GA4_VIEWER_ORIGIN)).statusCode, 204);
    assert.equal((await post("organizer", organizer, settings.GA4_ORGANIZER_ORIGIN, token)).statusCode, 204);
    assert.equal((await post("organizer", { ...envelope, event: "creation_succeeded" }, settings.GA4_ORGANIZER_ORIGIN, token)).statusCode, 204);

    assert.deepEqual(outgoing.map(({ url }) => url.searchParams.get("measurement_id")), [
      settings.GA4_VIEWER_MEASUREMENT_ID, settings.GA4_ORGANIZER_MEASUREMENT_ID, settings.GA4_ORGANIZER_MEASUREMENT_ID
    ]);
    for (const { url, options } of outgoing) {
      assert.equal(url.origin + url.pathname, "https://www.google-analytics.com/mp/collect");
      assert.deepEqual(options?.headers, { "Content-Type": "application/json" });
      assert.equal(options?.redirect, "error");
      assert.doesNotMatch(String(options?.body), /PRIVATE-TOKEN|private@example\.test|Private Player|account-fixture|user_id/);
    }
    const view = JSON.parse(String(outgoing[0].options?.body));
    assert.deepEqual(view.events, [{
      name: "page_view", params: {
        session_id: envelope.sessionId, page_location: "https://viewer.example/_analytics/scoreboard",
        page_title: "scoreboard", page_type: "scoreboard", viewer_acquisition: "google",
        page_referrer: "https://www.google.com/"
      }
    }]);
    assert.deepEqual(view.device, { category: "mobile" });
    assert.deepEqual(JSON.parse(String(outgoing[1].options?.body)).events, [{
      name: "creation_step_reached", params: { session_id: envelope.sessionId, feature_area: "setup", creation_step: "players" }
    }]);
  } finally {
    await app.close();
    for (const [key, value] of restore) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

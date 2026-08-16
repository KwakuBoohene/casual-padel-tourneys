import test from "node:test";
import assert from "node:assert/strict";

import { parseAuthDeepLink } from "../../src/api/authDeepLink.js";

test("parseAuthDeepLink: magic custom scheme", () => {
  const link = parseAuthDeepLink("padel://auth/magic?token=abc123tokenvalue");
  assert.deepEqual(link, { kind: "magic", token: "abc123tokenvalue" });
});

test("parseAuthDeepLink: reset custom scheme", () => {
  const link = parseAuthDeepLink("padel://auth/reset?token=reset-token-xyz");
  assert.deepEqual(link, { kind: "reset", token: "reset-token-xyz" });
});

test("parseAuthDeepLink: rejects missing token", () => {
  assert.equal(parseAuthDeepLink("padel://auth/magic"), null);
});

test("parseAuthDeepLink: Expo Router path-style magic", () => {
  const link = parseAuthDeepLink("/auth/magic?token=path-magic-token");
  assert.deepEqual(link, { kind: "magic", token: "path-magic-token" });
});

test("parseAuthDeepLink: https web-style reset", () => {
  const link = parseAuthDeepLink("https://example.com/auth/reset?token=web-reset-token");
  assert.deepEqual(link, { kind: "reset", token: "web-reset-token" });
});

test("parseAuthDeepLink: empty / whitespace is null", () => {
  assert.equal(parseAuthDeepLink(""), null);
  assert.equal(parseAuthDeepLink("   "), null);
});

test("parseAuthDeepLink: unknown path with token is null", () => {
  assert.equal(parseAuthDeepLink("padel://auth/other?token=abc"), null);
  assert.equal(parseAuthDeepLink("https://example.com/home?token=abc"), null);
});

test("parseAuthDeepLink: trims token whitespace", () => {
  const link = parseAuthDeepLink("padel://auth/magic?token=%20trim-me%20");
  assert.deepEqual(link, { kind: "magic", token: "trim-me" });
});

test("parseAuthDeepLink: reset custom scheme without token is null", () => {
  assert.equal(parseAuthDeepLink("padel://auth/reset?"), null);
});

test("parseAuthDeepLink: garbage string is null", () => {
  assert.equal(parseAuthDeepLink("not a url :::"), null);
});

import test from "node:test";
import assert from "node:assert/strict";
import { resolvePublicApiBaseUrl } from "../../lib/apiConfig";

test("an unconfigured viewer fails loudly instead of falling back to localhost", () => {
  for (const value of [undefined, "", "   "]) {
    assert.throws(() => resolvePublicApiBaseUrl(value), /PUBLIC_API_BASE_URL is not set/);
  }
});

test("trailing slashes and whitespace are normalised", () => {
  assert.equal(resolvePublicApiBaseUrl("  https://api.example.com///  "), "https://api.example.com");
});

test("localhost is rejected in production", () => {
  for (const value of ["http://localhost:3004", "http://127.0.0.1:3004", "http://[::1]:3004"]) {
    assert.throws(() => resolvePublicApiBaseUrl(value), /visitor's own machine/);
  }
});

test("localhost stays valid in development", () => {
  assert.equal(resolvePublicApiBaseUrl("http://localhost:3004", false), "http://localhost:3004");
});

test("a real production origin passes", () => {
  assert.equal(resolvePublicApiBaseUrl("https://cpa-api.example.com"), "https://cpa-api.example.com");
});

test("configuration must be an HTTP(S) origin without credentials", () => {
  for (const value of ["/api", "javascript:alert(1)", "https://user:pass@api.example.com", "https://api.example.com/path", "https://api.example.com?token=secret"]) {
    assert.throws(() => resolvePublicApiBaseUrl(value), /absolute HTTP\(S\) origin/);
  }
});

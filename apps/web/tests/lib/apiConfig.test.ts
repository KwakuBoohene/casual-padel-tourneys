import test from "node:test";
import assert from "node:assert/strict";

import { internalApiBaseUrl, publicApiBaseUrl, webSocketBaseUrl } from "../../lib/apiConfig";

function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const prior: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    prior[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("an unconfigured viewer fails loudly instead of falling back to localhost", () => {
  withEnv({ INTERNAL_API_BASE_URL: undefined, PUBLIC_API_BASE_URL: undefined }, () => {
    assert.throws(
      () => internalApiBaseUrl(),
      /Neither INTERNAL_API_BASE_URL nor PUBLIC_API_BASE_URL/
    );
    assert.throws(() => publicApiBaseUrl(), /PUBLIC_API_BASE_URL is not set/);
  });
});

test("the internal origin falls back to the public one", () => {
  withEnv({ INTERNAL_API_BASE_URL: undefined, PUBLIC_API_BASE_URL: "https://api.example.com" }, () => {
    assert.equal(internalApiBaseUrl(), "https://api.example.com");
  });
});

test("the internal origin wins when both are set", () => {
  withEnv(
    { INTERNAL_API_BASE_URL: "http://api:3004", PUBLIC_API_BASE_URL: "https://api.example.com" },
    () => {
      assert.equal(internalApiBaseUrl(), "http://api:3004");
      assert.equal(publicApiBaseUrl(), "https://api.example.com");
    }
  );
});

test("trailing slashes and whitespace are normalised", () => {
  withEnv({ PUBLIC_API_BASE_URL: "  https://api.example.com///  " }, () => {
    assert.equal(publicApiBaseUrl(), "https://api.example.com");
  });
});

test("a blank value counts as unset", () => {
  withEnv({ INTERNAL_API_BASE_URL: "   ", PUBLIC_API_BASE_URL: undefined }, () => {
    assert.throws(() => internalApiBaseUrl(), /Neither INTERNAL_API_BASE_URL/);
  });
});

test("localhost is rejected in production — it is the visitor's own machine", () => {
  for (const value of ["http://localhost:3004", "http://127.0.0.1:3004", "https://localhost"]) {
    withEnv({ NODE_ENV: "production", PUBLIC_API_BASE_URL: value }, () => {
      assert.throws(() => publicApiBaseUrl(), /points at the visitor's own machine/, value);
    });
  }
});

test("localhost stays valid in development", () => {
  withEnv({ NODE_ENV: "development", PUBLIC_API_BASE_URL: "http://localhost:3004" }, () => {
    assert.equal(publicApiBaseUrl(), "http://localhost:3004");
  });
});

test("a real production origin passes", () => {
  withEnv({ NODE_ENV: "production", PUBLIC_API_BASE_URL: "https://cpa-api.example.com" }, () => {
    assert.equal(publicApiBaseUrl(), "https://cpa-api.example.com");
  });
});

test("an https origin never yields an insecure socket", () => {
  withEnv({ PUBLIC_API_BASE_URL: "https://api.example.com" }, () => {
    assert.equal(webSocketBaseUrl(), "wss://api.example.com");
  });
  withEnv({ NODE_ENV: "development", PUBLIC_API_BASE_URL: "http://localhost:3004" }, () => {
    assert.equal(webSocketBaseUrl(), "ws://localhost:3004");
  });
});

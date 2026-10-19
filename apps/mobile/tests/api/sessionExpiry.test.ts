import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  clearSessionExpiry,
  isSessionExpiryFailure,
  isSessionExpiryLatched,
  notifyAuthFailure,
  setSessionExpiryHandler
} from "../../src/api/sessionExpiry";

describe("isSessionExpiryFailure", () => {
  it("treats a 401 on an authenticated request as an expired session", () => {
    assert.equal(isSessionExpiryFailure("/tournaments", 401, true), true);
    assert.equal(isSessionExpiryFailure("/players/suggestions", 401, true), true);
  });

  it("ignores 401s from unauthenticated credential endpoints", () => {
    assert.equal(isSessionExpiryFailure("/auth/password/login/finish", 401, true), false);
    assert.equal(isSessionExpiryFailure("/auth/password/reset/consume", 401, true), false);
    // A stale token is still attached to these, so the path exemption is what saves the flow.
    assert.equal(isSessionExpiryFailure("/auth/magic-link/consume", 401, true), false);
    assert.equal(isSessionExpiryFailure("/auth/google", 401, true), false);
    assert.equal(isSessionExpiryFailure("/auth/guest", 401, false), false);
  });

  it("keeps the attach flows distinct from the unauthenticated register flow", () => {
    assert.equal(isSessionExpiryFailure("/auth/password/register/start", 401, true), false);
    assert.equal(isSessionExpiryFailure("/auth/attach/password/register/start", 401, true), true);
    assert.equal(isSessionExpiryFailure("/auth/me", 401, true), true);
  });

  it("ignores requests that carried no token and statuses other than 401", () => {
    assert.equal(isSessionExpiryFailure("/tournaments", 401, false), false);
    assert.equal(isSessionExpiryFailure("/tournaments", 403, true), false);
    assert.equal(isSessionExpiryFailure("/tournaments", 500, true), false);
  });
});

describe("notifyAuthFailure", () => {
  beforeEach(() => {
    clearSessionExpiry();
    setSessionExpiryHandler(null);
  });

  it("fires the handler once no matter how many requests 401 together", () => {
    let calls = 0;
    setSessionExpiryHandler(() => {
      calls += 1;
    });

    notifyAuthFailure("/tournaments", 401, true);
    notifyAuthFailure("/players/suggestions", 401, true);
    notifyAuthFailure("/me/players/leaderboard", 401, true);

    assert.equal(calls, 1);
    assert.equal(isSessionExpiryLatched(), true);
  });

  it("does not latch or fire for a non-expiry failure", () => {
    let calls = 0;
    setSessionExpiryHandler(() => {
      calls += 1;
    });

    notifyAuthFailure("/auth/password/login/finish", 401, true);
    notifyAuthFailure("/tournaments", 500, true);

    assert.equal(calls, 0);
    assert.equal(isSessionExpiryLatched(), false);
  });

  it("re-arms after a successful sign-in clears the latch", () => {
    let calls = 0;
    setSessionExpiryHandler(() => {
      calls += 1;
    });

    notifyAuthFailure("/tournaments", 401, true);
    clearSessionExpiry();
    assert.equal(isSessionExpiryLatched(), false);

    notifyAuthFailure("/tournaments", 401, true);
    assert.equal(calls, 2);
  });
});

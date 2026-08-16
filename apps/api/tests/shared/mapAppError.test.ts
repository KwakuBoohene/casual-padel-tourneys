import test from "node:test";
import assert from "node:assert/strict";

import { AppError, conflict, forbidden, notFound, validation } from "../../src/shared/kernel/appError.js";
import { legacyMutationStatus, mapAppError } from "../../src/shared/http/mapAppError.js";

function fakeReply() {
  let statusCode = 200;
  return {
    status(code: number) {
      statusCode = code;
      return this;
    },
    getStatus() {
      return statusCode;
    }
  };
}

test("mapAppError maps AppError codes to HTTP status", () => {
  const cases: Array<[AppError, number]> = [
    [notFound("Tournament not found."), 404],
    [conflict("Version mismatch. Refresh tournament data."), 409],
    [forbidden("Forbidden"), 403],
    [validation("Bad input"), 400]
  ];
  for (const [error, expected] of cases) {
    const reply = fakeReply();
    const body = mapAppError(reply as never, error);
    assert.equal(reply.getStatus(), expected);
    assert.equal(body.message, error.message);
  }
});

test("mapAppError maps unknown errors to 500 without leaking stacks", () => {
  const reply = fakeReply();
  const body = mapAppError(reply as never, { weird: true });
  assert.equal(reply.getStatus(), 500);
  assert.equal(body.message, "Internal server error.");
});

test("legacyMutationStatus preserves fat-route heuristics", () => {
  assert.equal(legacyMutationStatus("Tournament abc not found."), 404);
  assert.equal(legacyMutationStatus("Version mismatch. Refresh tournament data."), 409);
  assert.equal(legacyMutationStatus("Finish the current round before generating the next."), 400);
});

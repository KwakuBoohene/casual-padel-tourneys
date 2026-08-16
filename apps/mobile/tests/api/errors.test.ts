import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError, isEmailVerifyRequired } from "../../src/api/errors";

describe("isEmailVerifyRequired", () => {
  it("returns true only for EMAIL_VERIFY_REQUIRED ApiError", () => {
    assert.equal(
      isEmailVerifyRequired(
        new ApiError({ message: "verify", status: 403, code: "EMAIL_VERIFY_REQUIRED", verifyBy: 99 })
      ),
      true
    );
    assert.equal(
      isEmailVerifyRequired(new ApiError({ message: "nope", status: 400, code: "BAD_REQUEST" })),
      false
    );
    assert.equal(isEmailVerifyRequired(new Error("plain")), false);
    assert.equal(isEmailVerifyRequired(null), false);
  });
});

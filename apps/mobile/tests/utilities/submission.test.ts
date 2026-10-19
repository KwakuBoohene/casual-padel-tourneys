import assert from "node:assert/strict";
import test from "node:test";

import { createSubmission } from "../../src/utilities/submission";

test("repeated presses before the first render send only one action", async () => {
  const saving: boolean[] = [];
  const submission = createSubmission((value) => saving.push(value));
  let resolveRequest!: (value: string) => void;
  const request = new Promise<string>((resolve) => {
    resolveRequest = resolve;
  });
  let requests = 0;
  const submit = () =>
    submission.run(() => {
      requests += 1;
      return request;
    });

  const first = submit();
  assert.equal(submission.isPending(), true);
  assert.equal(await submit(), undefined);
  assert.equal(await submit(), undefined);
  assert.equal(requests, 1);
  assert.deepEqual(saving, [true]);

  resolveRequest("saved");
  assert.equal(await first, "saved");
  assert.equal(submission.isPending(), false);
  assert.deepEqual(saving, [true, false]);
});

test("a failed action reports its error and unlocks the form for a manual retry", async () => {
  const saving: boolean[] = [];
  const submission = createSubmission((value) => saving.push(value));
  const failure = new Error("Connection unavailable");

  await assert.rejects(
    submission.run(async () => {
      throw failure;
    }),
    (error) => error === failure
  );
  assert.equal(submission.isPending(), false);
  assert.equal(await submission.run(async () => "saved"), "saved");
  assert.deepEqual(saving, [true, false, true, false]);
});

test("a synchronous failure also releases the guard without retrying the action", async () => {
  const submission = createSubmission(() => {});
  let requests = 0;
  await assert.rejects(
    submission.run(() => {
      requests += 1;
      throw new Error("Invalid action");
    }),
    /Invalid action/
  );
  assert.equal(requests, 1);
  assert.equal(submission.isPending(), false);
});

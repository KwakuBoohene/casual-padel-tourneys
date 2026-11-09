import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { VisitClient, type VisitAdapters } from "../../src/utilities/usage/VisitClient";
import type { UsageVisit } from "@padel/shared";
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function harness() {
  let value: string | null = null;
  let chain = Promise.resolve();
  const sent: UsageVisit[][] = [];
  const adapters: VisitAdapters = {
    uuid: randomUUID,
    read: async () => value,
    write: async (next) => {
      value = next;
    },
    visible: () => true,
    send: async (events) => {
      sent.push(events);
    },
    lock: async (work) => {
      chain = chain.then(work);
      await chain;
    }
  };
  return { adapters, sent };
}
test("tabs share a serialized session and suppress duplicate same-screen foreground visits", async () => {
  const { adapters, sent } = harness();
  const a = new VisitClient(adapters, "actor"),
    b = new VisitClient(adapters, "actor");
  await Promise.all([a.visit("home"), b.visit("home")]);
  await settle();
  assert.equal(sent.flat().length, 1);
  await b.visit("tournaments");
  await settle();
  assert.equal(sent.flat().length, 2);
  assert.equal(sent[0][0].sessionId, sent[1][0].sessionId);
  a.stop();
  b.stop();
});
test("hidden, stopped and late storage completions never deliver visits", async () => {
  const { adapters, sent } = harness();
  adapters.visible = () => false;
  const hidden = new VisitClient(adapters, "actor");
  await hidden.visit("home");
  assert.equal(sent.length, 0);
  adapters.visible = () => true;
  let release!: () => void;
  adapters.read = () =>
    new Promise((resolve) => {
      release = () => resolve(null);
    });
  const client = new VisitClient(adapters, "actor");
  const pending = client.visit("home");
  await settle();
  client.stop();
  release();
  await pending;
  await settle();
  assert.equal(sent.length, 0);
  hidden.stop();
});
test("retries preserve event identity and opt-out cancels retry delivery", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { adapters, sent } = harness();
  let calls = 0;
  adapters.send = async (events) => {
    calls++;
    sent.push(events);
    throw new Error("offline");
  };
  const client = new VisitClient(adapters, "actor");
  await client.visit("home");
  await settle();
  t.mock.timers.tick(2000);
  await settle();
  assert.equal(calls, 2);
  assert.equal(sent[0][0].id, sent[1][0].id);
  client.stop();
  t.mock.timers.tick(30_000);
  await settle();
  assert.equal(calls, 2);
});

test("failed delivery stops after three attempts", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { adapters } = harness();
  let calls = 0;
  adapters.send = async () => {
    calls++;
    throw new Error("offline");
  };
  const client = new VisitClient(adapters, "actor");
  await client.visit("home");
  await settle();
  t.mock.timers.tick(2000);
  await settle();
  t.mock.timers.tick(4000);
  await settle();
  t.mock.timers.tick(60_000);
  await settle();
  assert.equal(calls, 3);
  client.stop();
});

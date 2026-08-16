import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readWithLegacyMigration } from "../../../src/utilities/organizer/localValueMigration";

function memoryBackend(seed: Record<string, string | null> = {}) {
  const store = new Map<string, string>(
    Object.entries(seed).filter((entry): entry is [string, string] => entry[1] != null)
  );
  return {
    store,
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    }
  };
}

describe("readWithLegacyMigration", () => {
  it("returns primary value without touching legacy", async () => {
    const primary = memoryBackend({ theme: "light" });
    const legacy = memoryBackend({ theme: "dark" });
    const value = await readWithLegacyMigration("theme", primary, legacy);
    assert.equal(value, "light");
    assert.equal(legacy.store.get("theme"), "dark");
  });

  it("migrates legacy into primary and clears legacy", async () => {
    const primary = memoryBackend();
    const legacy = memoryBackend({ "scoreDraft:t1": '{"a":"1"}' });
    const value = await readWithLegacyMigration("scoreDraft:t1", primary, legacy);
    assert.equal(value, '{"a":"1"}');
    assert.equal(primary.store.get("scoreDraft:t1"), '{"a":"1"}');
    assert.equal(legacy.store.has("scoreDraft:t1"), false);
  });

  it("returns null when both stores miss", async () => {
    const value = await readWithLegacyMigration("missing", memoryBackend(), memoryBackend());
    assert.equal(value, null);
  });

  it("skips migration when legacy backend is null", async () => {
    const value = await readWithLegacyMigration("theme", memoryBackend(), null);
    assert.equal(value, null);
  });
});

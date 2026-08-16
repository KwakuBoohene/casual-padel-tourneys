export type StorageBackend = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/** Pure migrate-on-read for tests and production. */
export async function readWithLegacyMigration(
  key: string,
  primary: StorageBackend,
  legacy: StorageBackend | null
): Promise<string | null> {
  const current = await primary.getItem(key);
  if (current != null) {
    return current;
  }
  if (!legacy) {
    return null;
  }
  let legacyValue: string | null = null;
  try {
    legacyValue = await legacy.getItem(key);
  } catch {
    return null;
  }
  if (legacyValue == null) {
    return null;
  }
  try {
    await primary.setItem(key, legacyValue);
    await legacy.removeItem(key);
  } catch {
    // Prefer returning the value even if migrate/cleanup fails.
  }
  return legacyValue;
}

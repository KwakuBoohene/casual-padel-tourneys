import { readWithLegacyMigration, type StorageBackend } from "./localValueMigration";

function webStorage(): StorageBackend | null {
  const anyGlobal = globalThis as typeof globalThis & {
    localStorage?: {
      getItem(storageKey: string): string | null;
      setItem(storageKey: string, storageValue: string): void;
      removeItem(storageKey: string): void;
    };
  };
  if (!anyGlobal.localStorage) {
    return null;
  }
  return {
    getItem: async (key) => anyGlobal.localStorage!.getItem(key),
    setItem: async (key, value) => {
      anyGlobal.localStorage!.setItem(key, value);
    },
    removeItem: async (key) => {
      anyGlobal.localStorage!.removeItem(key);
    }
  };
}

function primaryStorage(): StorageBackend {
  return (
    webStorage() ?? {
      getItem: async () => null,
      setItem: async () => undefined,
      removeItem: async () => undefined
    }
  );
}

export async function readLocalValue(key: string): Promise<string | null> {
  return readWithLegacyMigration(key, primaryStorage(), null);
}

export async function writeLocalValue(key: string, value: string): Promise<void> {
  await primaryStorage().setItem(key, value);
}

export async function deleteLocalValue(key: string): Promise<void> {
  await primaryStorage().removeItem(key);
}

export async function clearOrganizerDrafts(actorId: string, organizerId: string): Promise<void> {
  const storage = globalThis.localStorage;
  if (!storage) return;
  const prefix = `scoreDraft:${actorId}:${organizerId}:`;
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) if (key?.startsWith(prefix)) storage.removeItem(key);
}

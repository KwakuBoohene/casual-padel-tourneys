import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  readWithLegacyMigration,
  type StorageBackend
} from "./localValueMigration";

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
  if (Platform.OS === "web") {
    return (
      webStorage() ?? {
        getItem: async () => null,
        setItem: async () => undefined,
        removeItem: async () => undefined
      }
    );
  }
  return {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key)
  };
}

/** Native-only: previous non-secret values lived in SecureStore. */
function legacySecureStorage(): StorageBackend | null {
  if (Platform.OS === "web") {
    return null;
  }
  return {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: async () => undefined,
    removeItem: (key) => SecureStore.deleteItemAsync(key)
  };
}

export async function readLocalValue(key: string): Promise<string | null> {
  return readWithLegacyMigration(key, primaryStorage(), legacySecureStorage());
}

export async function writeLocalValue(key: string, value: string): Promise<void> {
  await primaryStorage().setItem(key, value);
}

export async function deleteLocalValue(key: string): Promise<void> {
  await primaryStorage().removeItem(key);
  const legacy = legacySecureStorage();
  if (!legacy) {
    return;
  }
  try {
    await legacy.removeItem(key);
  } catch {
    // ignore legacy cleanup failures
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import {
  readWithLegacyMigration,
  type StorageBackend
} from "./localValueMigration";

function primaryStorage(): StorageBackend {
  return {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key)
  };
}

/** Native-only: previous non-secret values lived in SecureStore. */
function legacySecureStorage(): StorageBackend {
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
  try {
    await legacySecureStorage().removeItem(key);
  } catch {
    // ignore legacy cleanup failures
  }
}

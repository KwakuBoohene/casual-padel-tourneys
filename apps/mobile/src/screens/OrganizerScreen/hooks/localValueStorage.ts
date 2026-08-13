import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export async function readLocalValue(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    const anyGlobal = globalThis as typeof globalThis & {
      localStorage?: { getItem(storageKey: string): string | null };
    };
    if (typeof anyGlobal !== "undefined" && anyGlobal.localStorage) {
      return anyGlobal.localStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

export async function writeLocalValue(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    const anyGlobal = globalThis as typeof globalThis & {
      localStorage?: { setItem(storageKey: string, storageValue: string): void };
    };
    if (typeof anyGlobal !== "undefined" && anyGlobal.localStorage) {
      anyGlobal.localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteLocalValue(key: string): Promise<void> {
  if (Platform.OS === "web") {
    const anyGlobal = globalThis as typeof globalThis & {
      localStorage?: { removeItem(storageKey: string): void };
    };
    if (typeof anyGlobal !== "undefined" && anyGlobal.localStorage) {
      anyGlobal.localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

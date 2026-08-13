import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import type { AuthUser } from "./auth";
import { setAuthToken } from "./client";

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";

async function readLocalValue(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    const anyGlobal = globalThis as typeof globalThis & {
      localStorage?: { getItem(storageKey: string): string | null };
    };
    return anyGlobal.localStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function writeLocalValue(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    const anyGlobal = globalThis as typeof globalThis & {
      localStorage?: { setItem(storageKey: string, storageValue: string): void };
    };
    anyGlobal.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteLocalValue(key: string): Promise<void> {
  if (Platform.OS === "web") {
    const anyGlobal = globalThis as typeof globalThis & {
      localStorage?: { removeItem(storageKey: string): void };
    };
    anyGlobal.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function loadStoredAuth(): Promise<{ token: string | null; user: AuthUser | null }> {
  const token = await readLocalValue(TOKEN_KEY);
  const rawUser = await readLocalValue(USER_KEY);
  let user: AuthUser | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as AuthUser;
    } catch {
      user = null;
    }
  }
  if (token) {
    setAuthToken(token);
  }
  return { token, user };
}

export async function persistAuthSession(token: string, user: AuthUser): Promise<void> {
  setAuthToken(token);
  await writeLocalValue(TOKEN_KEY, token);
  await writeLocalValue(USER_KEY, JSON.stringify(user));
}

export async function clearAuthSession(): Promise<void> {
  setAuthToken(null);
  await deleteLocalValue(TOKEN_KEY);
  await deleteLocalValue(USER_KEY);
}

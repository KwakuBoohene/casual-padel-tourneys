import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const GUEST_ID_KEY = "guestId";

export function generateGuestId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getStoredGuestId(): Promise<string | null> {
  if (Platform.OS === "web") {
    const anyGlobal = globalThis as typeof globalThis & {
      localStorage?: { getItem(key: string): string | null };
    };
    if (typeof anyGlobal !== "undefined" && anyGlobal.localStorage) {
      return anyGlobal.localStorage.getItem(GUEST_ID_KEY);
    }
    return null;
  }

  return SecureStore.getItemAsync(GUEST_ID_KEY);
}

export async function storeGuestId(guestId: string): Promise<void> {
  if (Platform.OS === "web") {
    const anyGlobal = globalThis as typeof globalThis & {
      localStorage?: { setItem(key: string, value: string): void };
    };
    if (typeof anyGlobal !== "undefined" && anyGlobal.localStorage) {
      anyGlobal.localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return;
  }

  await SecureStore.setItemAsync(GUEST_ID_KEY, guestId);
}

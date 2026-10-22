import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
const key = "pendingOrganizerInvitation";
export function parseOrganizerInviteUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!`${parsed.host}${parsed.pathname}`.includes("invite/accept")) return null;
    const token = new URLSearchParams(parsed.hash.slice(1)).get("token");
    return token && /^[A-Za-z0-9_-]{40,128}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}
export async function savePendingOrganizerInvite(token: string) {
  const value = JSON.stringify({ token, expiresAt: Date.now() + 30 * 60 * 1000 });
  if (Platform.OS === "web") {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  } else await SecureStore.setItemAsync(key, value);
}
export async function loadPendingOrganizerInvite(): Promise<string | null> {
  try {
    const raw = Platform.OS === "web" ? sessionStorage.getItem(key) : await SecureStore.getItemAsync(key);
    const value = raw ? (JSON.parse(raw) as { token: string; expiresAt: number }) : null;
    return value && value.expiresAt > Date.now() ? value.token : null;
  } catch {
    return null;
  }
}
export async function clearPendingOrganizerInvite() {
  if (Platform.OS === "web") {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  } else await SecureStore.deleteItemAsync(key);
}
export async function destinationAfterSignIn(): Promise<"/invite/accept" | "/"> {
  return (await loadPendingOrganizerInvite()) ? "/invite/accept" : "/";
}

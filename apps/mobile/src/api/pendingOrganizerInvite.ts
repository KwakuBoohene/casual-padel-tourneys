import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { parseInviteUrl, parseStoredInvite, type PendingInvite } from "./inviteLinks";

export { parseInviteUrl, type PendingInvite, type PendingInviteKind } from "./inviteLinks";

const key = "pendingOrganizerInvitation";

export const parseOrganizerInviteUrl = (url: string | null) => parseInviteUrl(url, "organizer");
export const parseDraftInviteUrl = (url: string | null) => parseInviteUrl(url, "draft");

/** One pending invite at a time (30 min), resumed after sign-in / verify. */
export async function savePendingInvite(invite: PendingInvite) {
  const value = JSON.stringify({ ...invite, expiresAt: Date.now() + 30 * 60 * 1000 });
  if (Platform.OS === "web") {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  } else await SecureStore.setItemAsync(key, value);
}

export const savePendingOrganizerInvite = (token: string) => savePendingInvite({ kind: "organizer", token });

export async function loadPendingInvite(): Promise<PendingInvite | null> {
  try {
    const raw = Platform.OS === "web" ? sessionStorage.getItem(key) : await SecureStore.getItemAsync(key);
    return parseStoredInvite(raw);
  } catch {
    return null;
  }
}

export async function loadPendingOrganizerInvite(): Promise<string | null> {
  const invite = await loadPendingInvite();
  return invite?.kind === "organizer" ? invite.token : null;
}

export async function loadPendingDraftInvite(): Promise<string | null> {
  const invite = await loadPendingInvite();
  return invite?.kind === "draft" ? invite.token : null;
}

export async function clearPendingOrganizerInvite() {
  if (Platform.OS === "web") {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  } else await SecureStore.deleteItemAsync(key);
}

export const clearPendingInvite = clearPendingOrganizerInvite;

export async function destinationAfterSignIn(): Promise<"/invite/accept" | "/invite/draft" | "/"> {
  const invite = await loadPendingInvite();
  if (!invite) return "/";
  return invite.kind === "draft" ? "/invite/draft" : "/invite/accept";
}

import type { OrganizerAccount } from "@padel/shared";

let actorId = "";
let account: OrganizerAccount | null = null;
let generation = 0;
let writes = 0;
const requests = new Set<AbortController>();
const versions = new Map<string, number>();
let accessLost: (() => void) | null = null;
let conflict: (() => void) | null = null;

export function setOrganizerIdentity(id: string) {
  if (actorId === id) return;
  actorId = id;
  invalidateContext(null);
}
export function setSelectedOrganizer(next: OrganizerAccount | null) {
  if (account?.id === next?.id && account?.role === next?.role) return;
  invalidateContext(next);
}
function invalidateContext(next: OrganizerAccount | null) {
  generation += 1;
  for (const request of requests) request.abort();
  requests.clear();
  versions.clear();
  account = next;
}
export function getOrganizerScope() {
  return [actorId, account?.id ?? actorId] as const;
}
export function getSelectedOrganizer() {
  return account;
}
export function pendingOrganizerWrites() {
  return writes;
}
export function setOrganizerAccessLostHandler(handler: (() => void) | null) {
  accessLost = handler;
}
export function setOrganizerConflictHandler(handler: (() => void) | null) {
  conflict = handler;
}
export function notifyOrganizerAccessLost() {
  accessLost?.();
}
export function notifyOrganizerConflict() {
  conflict?.();
}
export function captureOrganizerContext() {
  const captured = generation;
  const selected = account;
  const headers: Record<string, string> = selected ? { "X-Organizer-Id": selected.id } : {};
  return {
    headers,
    account: selected,
    assertCurrent() {
      if (generation !== captured)
        throw new Error("Organizer account changed. The previous request was cancelled.");
    },
    path(path: string) {
      return selected && selected.id !== actorId && /^\/me\/(players|career-share)/.test(path)
        ? path.replace(/^\/me\//, `/organizers/${encodeURIComponent(selected.id)}/`)
        : path;
    }
  };
}
export function trackOrganizerRequest(controller: AbortController, mutation: boolean) {
  requests.add(controller);
  if (mutation) writes += 1;
  return () => {
    requests.delete(controller);
    if (mutation) writes -= 1;
  };
}
export function rememberTournamentVersion(value: unknown) {
  if (Array.isArray(value)) {
    for (const item of value) rememberTournamentVersion(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  const row = value as { id?: string; version?: number };
  if (row.id && Number.isInteger(row.version)) versions.set(row.id, row.version!);
}
/** Supply versions from the state the client has actually loaded, never an automatic retry. */
export function withKnownTournamentVersion(path: string, payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const body = payload as Record<string, unknown>;
  const id =
    path.match(/^\/koh\/tournaments\/([^/]+)/)?.[1] ??
    (typeof body.tournamentId === "string" ? body.tournamentId : undefined);
  if (body.expectedVersion !== undefined || !id || !versions.has(id)) return payload;
  return { ...body, expectedVersion: versions.get(id) };
}

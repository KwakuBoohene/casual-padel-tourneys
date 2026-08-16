import type { OrganizerPlayerRange } from "@padel/shared";

/** Career identities are matched case- and whitespace-insensitively per organizer. */
export function normalizeOrganizerPlayerName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** `null` means "no lower bound" (the `all` range). */
export function rangeStart(range: OrganizerPlayerRange, now = new Date()): Date | null {
  if (range === "all") return null;
  if (range === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

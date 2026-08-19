import type { OrganizerPlayersDeps } from "./ports.js";

export interface CareerShareState {
  /** Null when the organizer has not shared their board. */
  token: string | null;
}

export async function getCareerShare(
  deps: OrganizerPlayersDeps,
  organizerId: string
): Promise<CareerShareState> {
  return { token: await deps.repo.findShareToken(organizerId) };
}

/**
 * Idempotent: calling this twice returns the same link rather than silently killing one that is
 * already pinned somewhere. Changing the link is the explicit `rotate` action.
 */
export async function enableCareerShare(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  makeToken: () => string
): Promise<CareerShareState> {
  const existing = await deps.repo.findShareToken(organizerId);
  if (existing) {
    return { token: existing };
  }
  return { token: await deps.repo.setShareToken(organizerId, makeToken()) };
}

/** Issues a new token; the previous link stops working immediately. */
export async function rotateCareerShare(
  deps: OrganizerPlayersDeps,
  organizerId: string,
  makeToken: () => string
): Promise<CareerShareState> {
  return { token: await deps.repo.setShareToken(organizerId, makeToken()) };
}

export async function revokeCareerShare(
  deps: OrganizerPlayersDeps,
  organizerId: string
): Promise<CareerShareState> {
  await deps.repo.setShareToken(organizerId, null);
  return { token: null };
}

/**
 * Ownership check for organizer mutations / private reads.
 * Non-owners and missing organizerId are treated as "not found" (no id leak).
 */
export function assertOrganizer(
  userId: string,
  tournament: { organizerId?: string | null } | undefined | null
): void {
  if (!tournament?.organizerId || tournament.organizerId !== userId) {
    throw new Error("Tournament not found.");
  }
}

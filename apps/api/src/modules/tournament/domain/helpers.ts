import type { Match, Round } from "@padel/shared";
import type { TournamentState } from "../../../types/state.js";

export function touch(tournament: TournamentState): void {
  tournament.version += 1;
  tournament.updatedAt = new Date().toISOString();
}

export function findMatch(rounds: Round[], matchId: string): { round: Round; match: Match } {
  for (const round of rounds) {
    const match = round.matches.find((item) => item.id === matchId);
    if (match) {
      return { round, match };
    }
  }
  throw new Error("Match not found.");
}

export function assertMexicanoNotEnded(tournament: TournamentState): void {
  if (tournament.config.mode === "MEXICANO" && tournament.endedAt) {
    throw new Error("This Mexicano night has already ended.");
  }
}

export function assertTournamentVersion(tournament: TournamentState, expectedVersion: number): void {
  if (tournament.version !== expectedVersion) {
    throw new Error("Version mismatch. Refresh tournament data.");
  }
}

export function generateUniqueName(baseName: string, existingNames: string[]): string {
  const trimmedBase = baseName.trim();
  if (!existingNames.includes(trimmedBase)) {
    return trimmedBase;
  }
  let counter = 1;
  let uniqueName: string;
  do {
    const suffix = counter.toString().padStart(2, "0");
    uniqueName = `${trimmedBase} ${suffix}`;
    counter += 1;
  } while (existingNames.includes(uniqueName) && counter < 100);
  return uniqueName;
}

import type { CareerDelta } from "../domain/careerStats.js";

export interface CareerDeltaQuery {
  organizerId: string;
  /** `null` = no lower bound (the `all` range). */
  since: Date | null;
  organizerPlayerId?: string;
  /** When listing the account board, skip archived identities. Default true unless a player id is set. */
  activeOnly?: boolean;
}

export interface OrganizerManagedPlayerRow {
  id: string;
  name: string;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  suggestedRestoreName?: string;
}

/** One credited match for one career identity — the rows behind the account leaderboard. */
export interface CareerMatchRow {
  occurredAt: Date;
  tournamentName: string;
  tournamentMode: string;
  playerName: string;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  gamesWon: number;
  gamesLost: number;
  americanoPointsWon: number;
  americanoPointsLost: number;
}

export interface CareerMatchQuery {
  organizerId: string;
  /** `null` = no lower bound (the `all` range). */
  since: Date | null;
  /** Fetch one more than the cap so the caller can tell truncation from an exact fit. */
  limit: number;
}

export interface OrganizerPlayerRepository {
  /** Credited match results, newest first. */
  listDeltas(query: CareerDeltaQuery): Promise<CareerDelta[]>;
  /**
   * Per-match rows for the export, newest first. Includes archived identities — the match
   * happened even if the career has since been archived.
   */
  listMatchesForExport(query: CareerMatchQuery): Promise<CareerMatchRow[]>;
  findPlayer(organizerId: string, organizerPlayerId: string): Promise<{ id: string; name: string } | null>;
  listManaged(
    organizerId: string,
    status: "active" | "archived"
  ): Promise<OrganizerManagedPlayerRow[]>;
  archivePlayer(
    organizerId: string,
    organizerPlayerId: string
  ): Promise<{ id: string; name: string }>;
  archivePlayers(organizerId: string, playerIds: string[]): Promise<{ count: number }>;
  unarchivePlayer(
    organizerId: string,
    organizerPlayerId: string
  ): Promise<{ id: string; name: string }>;
  unarchivePlayers(organizerId: string, playerIds: string[]): Promise<{ count: number }>;
  mergePlayers(input: {
    organizerId: string;
    playerIdA: string;
    playerIdB: string;
    survivingName: string;
  }): Promise<{ id: string; name: string }>;
  renamePlayer(
    organizerId: string,
    organizerPlayerId: string,
    name: string
  ): Promise<{ id: string; name: string }>;
}

export interface OrganizerPlayersDeps {
  repo: OrganizerPlayerRepository;
}

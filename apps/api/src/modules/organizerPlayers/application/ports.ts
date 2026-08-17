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

export interface OrganizerPlayerRepository {
  /** Credited match results, newest first. */
  listDeltas(query: CareerDeltaQuery): Promise<CareerDelta[]>;
  findPlayer(organizerId: string, organizerPlayerId: string): Promise<{ id: string; name: string } | null>;
  listManaged(
    organizerId: string,
    status: "active" | "archived"
  ): Promise<OrganizerManagedPlayerRow[]>;
  archivePlayer(
    organizerId: string,
    organizerPlayerId: string
  ): Promise<{ id: string; name: string }>;
  unarchivePlayer(
    organizerId: string,
    organizerPlayerId: string
  ): Promise<{ id: string; name: string }>;
  mergePlayers(input: {
    organizerId: string;
    playerIdA: string;
    playerIdB: string;
    survivingName: string;
  }): Promise<{ id: string; name: string }>;
}

export interface OrganizerPlayersDeps {
  repo: OrganizerPlayerRepository;
}

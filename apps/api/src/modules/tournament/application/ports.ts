import type { TournamentMode } from "@padel/shared";

import type { TournamentEvent } from "../../../realtime/events.js";
import type { TournamentState } from "../../../types/state.js";

export interface TournamentRepository {
  getById(id: string): Promise<TournamentState | null>;
  getByPublicToken(token: string): Promise<TournamentState | null>;
  listByOrganizer(organizerId: string): Promise<TournamentState[]>;
  /** Insert a brand-new aggregate (create path). */
  create(state: TournamentState): Promise<void>;
  /**
   * Persist aggregate. `expectedVersion` is the version **before** the mutation
   * (clients send this). Fails with conflict if row.version !== expectedVersion.
   */
  save(state: TournamentState, expectedVersion: number): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TournamentEvents {
  publish(event: TournamentEvent): Promise<void>;
}

export interface CareerCreditRequest {
  organizerId: string;
  tournamentId: string;
  tournamentName: string;
  tournamentMode: TournamentMode;
  matchId: string;
  /** Every named player on the side — doubles credits all four. */
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  /** `null` for a drawn points match. */
  winnerSide: "A" | "B" | null;
  gamesA: number;
  gamesB: number;
}

/** Career board write port — implemented by the organizer players module's credit adapter. */
export interface CareerCredits {
  creditCompletedMatch(request: CareerCreditRequest): Promise<void>;
}

export type TournamentModuleDeps = {
  repo: TournamentRepository;
  events: TournamentEvents;
  career: CareerCredits;
};

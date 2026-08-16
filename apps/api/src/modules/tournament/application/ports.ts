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

export type TournamentModuleDeps = {
  repo: TournamentRepository;
  events: TournamentEvents;
};
